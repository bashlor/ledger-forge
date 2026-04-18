import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import {
  type AccountingAccessContext,
  type AccountingActivitySink,
  type AccountingBusinessCalendar,
  type AccountingServiceDependencies,
  SYSTEM_ACCOUNTING_ACCESS_CONTEXT,
  SystemAccountingBusinessCalendar,
} from '#core/accounting/accounting_context'
import { customers, invoiceLines, invoices, journalEntries } from '#core/accounting/drizzle/schema'
import { DomainError } from '#core/shared/domain_error'
import { and, count, desc, eq, gte, inArray, like, lte, sql } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'

import type { DateFilter } from './expense_service.js'

import { calculateLine, calculateTotals, fromDisplayUnits } from './invoice_calculations.js'

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export interface CustomerForSelectDto {
  company: string
  email: string
  id: string
  name: string
  phone: string
}

export interface InvoiceConcurrencyHooks {
  afterRead?: () => Promise<void>
}

// ---------------------------------------------------------------------------
// DTO types (match inertia/lib/types.ts shapes for Inertia props)
// ---------------------------------------------------------------------------

export interface InvoiceDto {
  createdAt: string
  customerCompanyAddressSnapshot: string
  customerCompanyName: string
  customerCompanySnapshot: string
  customerEmailSnapshot: string
  customerId: string
  customerPhoneSnapshot: string
  customerPrimaryContactSnapshot: string
  dueDate: string
  id: string
  invoiceNumber: string
  issueDate: string
  issuedCompanyAddress: string
  issuedCompanyName: string
  lines: InvoiceLineDto[]
  status: 'draft' | 'issued' | 'paid'
  subtotalExclTax: number
  totalInclTax: number
  totalVat: number
}

export interface InvoiceLineDto {
  description: string
  id: string
  lineTotalExclTax: number
  lineTotalInclTax: number
  lineVatAmount: number
  quantity: number
  unitPrice: number
  vatRate: number
}

export interface InvoiceListResult {
  items: InvoiceDto[]
  pagination: {
    page: number
    perPage: number
    totalItems: number
    totalPages: number
  }
}

export interface InvoiceSummaryDto {
  draftCount: number
  issuedCount: number
  overdueCount: number
}

export interface IssueInvoiceInput {
  issuedCompanyAddress: string
  issuedCompanyName: string
}

export interface SaveInvoiceDraftInput {
  customerId: string
  dueDate: string
  issueDate: string
  lines: SaveInvoiceLineInput[]
}

// ---------------------------------------------------------------------------
// Row types inferred from schema
// ---------------------------------------------------------------------------

export interface SaveInvoiceLineInput {
  description: string
  quantity: number
  unitPrice: number
  vatRate: number
}
type InvoiceCustomerSnapshot = Pick<
  InvoiceRow,
  | 'customerCompanyAddressSnapshot'
  | 'customerCompanySnapshot'
  | 'customerEmailSnapshot'
  | 'customerPhoneSnapshot'
  | 'customerPrimaryContactSnapshot'
>

type InvoiceLineRow = typeof invoiceLines.$inferSelect
interface InvoiceListScopeInput {
  customerId?: null | string
  dateFilter?: DateFilter
}

type InvoiceRow = typeof invoices.$inferSelect
interface NormalizedIssueInvoiceInput {
  issuedCompanyAddress: string
  issuedCompanyName: string
}

interface NormalizedSaveInvoiceDraftInput {
  customerId: string
  dueDate: string
  issueDate: string
  lines: SaveInvoiceLineInput[]
}

const MAX_PER_PAGE = 100
const MIN_PER_PAGE = 1

export class InvoiceService {
  private readonly activitySink?: AccountingActivitySink
  private readonly businessCalendar: AccountingBusinessCalendar

  constructor(
    private readonly db: PostgresJsDatabase<any>,
    dependencies: AccountingServiceDependencies = {}
  ) {
    this.activitySink = dependencies.activitySink
    this.businessCalendar = dependencies.businessCalendar ?? new SystemAccountingBusinessCalendar()
  }

  async createDraft(
    input: SaveInvoiceDraftInput,
    access: AccountingAccessContext = SYSTEM_ACCOUNTING_ACCESS_CONTEXT
  ): Promise<InvoiceDto> {
    const result = await this.db.transaction(async (tx) => {
      const normalized = normalizeSaveInvoiceDraftInput(input)
      assertInvoiceDates(normalized.issueDate, normalized.dueDate)
      const draftCreationDate = this.businessCalendar.today()
      assertDueDateIsNotBefore(
        normalized.dueDate,
        draftCreationDate,
        'Due date must be on or after the draft creation date.'
      )

      const [customer] = await tx
        .select({
          address: customers.address,
          company: customers.company,
          email: customers.email,
          id: customers.id,
          name: customers.name,
          phone: customers.phone,
        })
        .from(customers)
        .where(eq(customers.id, normalized.customerId))

      if (!customer) throw new DomainError('Customer not found.', 'not_found')

      const invoiceNumber = await nextInvoiceNumber(tx, normalized.issueDate)
      const invoiceId = uuidv7()

      const lineInputs = normalized.lines.map(fromDisplayUnits)
      const lineCalcs = lineInputs.map(calculateLine)
      const totals = calculateTotals(lineCalcs)

      const [invoice] = await tx
        .insert(invoices)
        .values({
          customerCompanyName: customer.company,
          customerId: normalized.customerId,
          issuedCompanyAddress: '',
          issuedCompanyName: '',
          ...toCustomerSnapshot(customer),
          dueDate: normalized.dueDate,
          id: invoiceId,
          invoiceNumber,
          issueDate: normalized.issueDate,
          status: 'draft',
          ...totals,
        })
        .returning()

      const lineValues = lineInputs.map((line, i) => ({
        description: line.description,
        id: uuidv7(),
        invoiceId,
        lineNumber: i + 1,
        quantityCents: line.quantityHundredths,
        unitPriceCents: line.unitPriceCents,
        vatRateCents: line.vatRateCents,
        ...lineCalcs[i],
      }))

      const insertedLines = await tx.insert(invoiceLines).values(lineValues).returning()

      return this.toInvoiceDto(invoice, insertedLines.map(toLineDto))
    })

    await this.activitySink?.record({
      actorId: access.actorId,
      boundedContext: 'accounting',
      isAnonymous: access.isAnonymous,
      operation: 'create_invoice_draft',
      outcome: 'success',
      resourceId: result.id,
      resourceType: 'invoice',
    })

    return result
  }

  async deleteDraft(
    id: string,
    access: AccountingAccessContext = SYSTEM_ACCOUNTING_ACCESS_CONTEXT
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [deleted] = await tx
        .delete(invoices)
        .where(and(eq(invoices.id, id), eq(invoices.status, 'draft')))
        .returning({ id: invoices.id })

      if (!deleted) {
        const [again] = await tx
          .select({ id: invoices.id })
          .from(invoices)
          .where(eq(invoices.id, id))
        if (!again) {
          throw new DomainError('Invoice not found.', 'not_found')
        }
        throw new DomainError('Only draft invoices can be deleted.', 'business_logic_error')
      }
    })

    await this.activitySink?.record({
      actorId: access.actorId,
      boundedContext: 'accounting',
      isAnonymous: access.isAnonymous,
      operation: 'delete_invoice_draft',
      outcome: 'success',
      resourceId: id,
      resourceType: 'invoice',
    })
  }

  async findFirstInvoiceIdForCustomer(
    customerId: string,
    dateFilter?: DateFilter,
    _access: AccountingAccessContext = SYSTEM_ACCOUNTING_ACCESS_CONTEXT
  ): Promise<null | string> {
    const where = and(eq(invoices.customerId, customerId), invoiceDateCondition(dateFilter))
    const [row] = await this.db
      .select({ id: invoices.id })
      .from(invoices)
      .where(where)
      .orderBy(desc(invoices.issueDate), desc(invoices.invoiceNumber))
      .limit(1)

    return row?.id ?? null
  }

  async getInvoiceById(
    id: string,
    _access: AccountingAccessContext = SYSTEM_ACCOUNTING_ACCESS_CONTEXT
  ): Promise<InvoiceDto | null> {
    const [invoice] = await this.db.select().from(invoices).where(eq(invoices.id, id))
    if (!invoice) return null

    const lineRows = await this.db
      .select()
      .from(invoiceLines)
      .where(eq(invoiceLines.invoiceId, id))
      .orderBy(invoiceLines.lineNumber)

    return this.toInvoiceDto(invoice, lineRows.map(toLineDto))
  }

  async getInvoiceForListScope(
    id: string,
    scope: InvoiceListScopeInput,
    _access: AccountingAccessContext = SYSTEM_ACCOUNTING_ACCESS_CONTEXT
  ): Promise<InvoiceDto | null> {
    let where = eq(invoices.id, id)

    if (scope.customerId) {
      where = and(where, eq(invoices.customerId, scope.customerId))!
    }

    if (scope.dateFilter) {
      where = and(where, invoiceDateCondition(scope.dateFilter))!
    }

    const [invoice] = await this.db.select().from(invoices).where(where)
    if (!invoice) return null

    const lineRows = await this.db
      .select()
      .from(invoiceLines)
      .where(eq(invoiceLines.invoiceId, id))
      .orderBy(invoiceLines.lineNumber)

    return this.toInvoiceDto(invoice, lineRows.map(toLineDto))
  }

  async getInvoiceSummary(
    dateFilter?: DateFilter,
    _access: AccountingAccessContext = SYSTEM_ACCOUNTING_ACCESS_CONTEXT
  ): Promise<InvoiceSummaryDto> {
    const where = invoiceDateCondition(dateFilter)
    const today = this.businessCalendar.today()

    const [row] = await this.db
      .select({
        draftCount:
          sql<number>`coalesce(sum(case when ${invoices.status} = 'draft' then 1 else 0 end), 0)::int`.mapWith(
            Number
          ),
        issuedCount:
          sql<number>`coalesce(sum(case when ${invoices.status} = 'issued' then 1 else 0 end), 0)::int`.mapWith(
            Number
          ),
        overdueCount:
          sql<number>`coalesce(sum(case when ${invoices.status} = 'issued' and ${invoices.dueDate} < ${today} then 1 else 0 end), 0)::int`.mapWith(
            Number
          ),
      })
      .from(invoices)
      .where(where)

    return {
      draftCount: row?.draftCount ?? 0,
      issuedCount: row?.issuedCount ?? 0,
      overdueCount: row?.overdueCount ?? 0,
    }
  }

  async issueInvoice(
    id: string,
    input: IssueInvoiceInput,
    hooks?: InvoiceConcurrencyHooks,
    access: AccountingAccessContext = SYSTEM_ACCOUNTING_ACCESS_CONTEXT
  ): Promise<InvoiceDto> {
    const result = await this.db.transaction(async (tx) => {
      const [existing] = await tx.select().from(invoices).where(eq(invoices.id, id))
      if (!existing) {
        throw new DomainError('Invoice not found.', 'not_found')
      }

      if (existing.status !== 'draft') {
        throw new DomainError('Only draft invoices can be issued.', 'business_logic_error')
      }
      await hooks?.afterRead?.()

      const [customer] = await tx
        .select({
          address: customers.address,
          company: customers.company,
          email: customers.email,
          name: customers.name,
          phone: customers.phone,
        })
        .from(customers)
        .where(eq(customers.id, existing.customerId))

      if (!customer) throw new DomainError('Customer not found.', 'not_found')
      const normalized = normalizeIssueInvoiceInput(input)
      const today = this.businessCalendar.today()
      assertDueDateIsNotBefore(
        existing.dueDate,
        today,
        'Due date must be today or later to issue an invoice.'
      )

      const [updated] = await tx
        .update(invoices)
        .set({
          customerCompanyName: customer.company,
          issuedCompanyAddress: normalized.issuedCompanyAddress,
          issuedCompanyName: normalized.issuedCompanyName,
          status: 'issued',
          ...toCustomerSnapshot(customer),
        })
        .where(and(eq(invoices.id, id), eq(invoices.status, 'draft')))
        .returning()

      if (!updated) {
        const [again] = await tx.select().from(invoices).where(eq(invoices.id, id))
        if (!again) {
          throw new DomainError('Invoice not found.', 'not_found')
        }
        throw new DomainError('Only draft invoices can be issued.', 'business_logic_error')
      }

      await tx.insert(journalEntries).values({
        amountCents: updated.totalInclTaxCents,
        date: updated.issueDate,
        id: uuidv7(),
        invoiceId: id,
        label: `Invoice ${updated.invoiceNumber}`,
        type: 'invoice',
      })

      const lineRows = await tx
        .select()
        .from(invoiceLines)
        .where(eq(invoiceLines.invoiceId, id))
        .orderBy(invoiceLines.lineNumber)

      return this.toInvoiceDto(updated, lineRows.map(toLineDto))
    })

    await this.activitySink?.record({
      actorId: access.actorId,
      boundedContext: 'accounting',
      isAnonymous: access.isAnonymous,
      operation: 'issue_invoice',
      outcome: 'success',
      resourceId: id,
      resourceType: 'invoice',
    })

    return result
  }

  async listCustomersForSelect(
    _access: AccountingAccessContext = SYSTEM_ACCOUNTING_ACCESS_CONTEXT
  ): Promise<CustomerForSelectDto[]> {
    return this.db
      .select({
        company: customers.company,
        email: customers.email,
        id: customers.id,
        name: customers.name,
        phone: customers.phone,
      })
      .from(customers)
      .orderBy(customers.company)
  }

  async listInvoices(
    page = 1,
    perPage = 5,
    dateFilter?: DateFilter,
    _access: AccountingAccessContext = SYSTEM_ACCOUNTING_ACCESS_CONTEXT
  ): Promise<InvoiceListResult> {
    const safePerPage = clampInteger(perPage, MIN_PER_PAGE, MAX_PER_PAGE)
    const where = invoiceDateCondition(dateFilter)

    const [{ totalCount }] = await this.db
      .select({ totalCount: count() })
      .from(invoices)
      .where(where)

    const totalPages = Math.max(1, Math.ceil(totalCount / safePerPage))
    const safePage = clampInteger(page, 1, totalPages)
    const offset = (safePage - 1) * safePerPage

    const invoiceRows = await this.db
      .select()
      .from(invoices)
      .where(where)
      .orderBy(desc(invoices.issueDate), desc(invoices.invoiceNumber))
      .limit(safePerPage)
      .offset(offset)

    if (invoiceRows.length === 0) {
      return {
        items: [],
        pagination: {
          page: safePage,
          perPage: safePerPage,
          totalItems: totalCount,
          totalPages,
        },
      }
    }

    const invoiceIds = invoiceRows.map((r) => r.id)
    const lineRows = await this.db
      .select()
      .from(invoiceLines)
      .where(inArray(invoiceLines.invoiceId, invoiceIds))
      .orderBy(invoiceLines.invoiceId, invoiceLines.lineNumber)

    const items = invoiceRows.map((invoice) => {
      const lines = lineRows.filter((l) => l.invoiceId === invoice.id).map(toLineDto)
      return this.toInvoiceDto(invoice, lines)
    })

    return {
      items,
      pagination: {
        page: safePage,
        perPage: safePerPage,
        totalItems: totalCount,
        totalPages,
      },
    }
  }

  async markInvoicePaid(
    id: string,
    hooks?: InvoiceConcurrencyHooks,
    access: AccountingAccessContext = SYSTEM_ACCOUNTING_ACCESS_CONTEXT
  ): Promise<InvoiceDto> {
    const result = await this.db.transaction(async (tx) => {
      const [existing] = await tx.select().from(invoices).where(eq(invoices.id, id))
      if (!existing) {
        throw new DomainError('Invoice not found.', 'not_found')
      }
      if (existing.status !== 'issued') {
        throw new DomainError('Only issued invoices can be marked as paid.', 'business_logic_error')
      }
      await hooks?.afterRead?.()

      const [updated] = await tx
        .update(invoices)
        .set({ status: 'paid' })
        .where(and(eq(invoices.id, id), eq(invoices.status, 'issued')))
        .returning()

      if (!updated) {
        const [again] = await tx.select().from(invoices).where(eq(invoices.id, id))
        if (!again) {
          throw new DomainError('Invoice not found.', 'not_found')
        }
        throw new DomainError('Only issued invoices can be marked as paid.', 'business_logic_error')
      }

      const lineRows = await tx
        .select()
        .from(invoiceLines)
        .where(eq(invoiceLines.invoiceId, id))
        .orderBy(invoiceLines.lineNumber)

      return this.toInvoiceDto(updated, lineRows.map(toLineDto))
    })

    await this.activitySink?.record({
      actorId: access.actorId,
      boundedContext: 'accounting',
      isAnonymous: access.isAnonymous,
      operation: 'mark_invoice_paid',
      outcome: 'success',
      resourceId: id,
      resourceType: 'invoice',
    })

    return result
  }

  async updateDraft(
    id: string,
    input: SaveInvoiceDraftInput,
    hooks?: InvoiceConcurrencyHooks,
    access: AccountingAccessContext = SYSTEM_ACCOUNTING_ACCESS_CONTEXT
  ): Promise<InvoiceDto> {
    const result = await this.db.transaction(async (tx) => {
      const normalized = normalizeSaveInvoiceDraftInput(input)
      assertInvoiceDates(normalized.issueDate, normalized.dueDate)

      const [existing] = await tx
        .select({
          createdAt: invoices.createdAt,
          issuedCompanyAddress: invoices.issuedCompanyAddress,
          issuedCompanyName: invoices.issuedCompanyName,
          status: invoices.status,
        })
        .from(invoices)
        .where(eq(invoices.id, id))

      if (!existing) throw new DomainError('Invoice not found.', 'not_found')
      if (existing.status !== 'draft') {
        throw new DomainError('Only draft invoices can be edited.', 'business_logic_error')
      }
      // Note: we only enforce dueDate >= createdAt here (not >= today) so that users can
      // still save edits to an existing draft whose due date has since passed. The stricter
      // "dueDate >= today" check is enforced at issue time via assertDueDateIsNotBefore.
      const draftCreationDate = this.businessCalendar.dateFromTimestamp(existing.createdAt)
      assertDueDateIsNotBefore(
        normalized.dueDate,
        draftCreationDate,
        'Due date must be on or after the draft creation date.'
      )
      await hooks?.afterRead?.()

      const [customer] = await tx
        .select({
          address: customers.address,
          company: customers.company,
          email: customers.email,
          name: customers.name,
          phone: customers.phone,
        })
        .from(customers)
        .where(eq(customers.id, normalized.customerId))

      if (!customer) throw new DomainError('Customer not found.', 'not_found')

      const lineInputs = normalized.lines.map(fromDisplayUnits)
      const lineCalcs = lineInputs.map(calculateLine)
      const totals = calculateTotals(lineCalcs)

      const [updated] = await tx
        .update(invoices)
        .set({
          customerCompanyName: customer.company,
          customerId: normalized.customerId,
          issuedCompanyAddress: existing.issuedCompanyAddress,
          issuedCompanyName: existing.issuedCompanyName,
          ...toCustomerSnapshot(customer),
          dueDate: normalized.dueDate,
          issueDate: normalized.issueDate,
          ...totals,
        })
        .where(and(eq(invoices.id, id), eq(invoices.status, 'draft')))
        .returning()

      if (!updated) {
        const [again] = await tx
          .select({ status: invoices.status })
          .from(invoices)
          .where(eq(invoices.id, id))
        if (!again) {
          throw new DomainError('Invoice not found.', 'not_found')
        }
        throw new DomainError('Only draft invoices can be edited.', 'business_logic_error')
      }

      await tx.delete(invoiceLines).where(eq(invoiceLines.invoiceId, id))

      const lineValues = lineInputs.map((line, i) => ({
        description: line.description,
        id: uuidv7(),
        invoiceId: id,
        lineNumber: i + 1,
        quantityCents: line.quantityHundredths,
        unitPriceCents: line.unitPriceCents,
        vatRateCents: line.vatRateCents,
        ...lineCalcs[i],
      }))

      const insertedLines = await tx.insert(invoiceLines).values(lineValues).returning()

      return this.toInvoiceDto(updated, insertedLines.map(toLineDto))
    })

    await this.activitySink?.record({
      actorId: access.actorId,
      boundedContext: 'accounting',
      isAnonymous: access.isAnonymous,
      operation: 'update_invoice_draft',
      outcome: 'success',
      resourceId: id,
      resourceType: 'invoice',
    })

    return result
  }

  private toInvoiceDto(row: InvoiceRow, lines: InvoiceLineDto[]): InvoiceDto {
    return toInvoiceDto(row, lines, this.businessCalendar.dateFromTimestamp(row.createdAt))
  }
}

function assertDueDateIsNotBefore(dueDate: string, minDate: string, message: string) {
  if (!dueDate || dueDate < minDate) {
    throw new DomainError(message, 'business_logic_error')
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

function assertInvoiceDates(issueDate: string, dueDate: string) {
  if (dueDate < issueDate) {
    throw new DomainError('Due date cannot be before the issue date.', 'business_logic_error')
  }
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  const normalized = Math.trunc(value)
  return Math.min(Math.max(normalized, min), max)
}

function invoiceDateCondition(filter?: DateFilter) {
  if (!filter) return undefined
  return and(gte(invoices.issueDate, filter.startDate), lte(invoices.issueDate, filter.endDate))
}

function isISODate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

async function nextInvoiceNumber(db: any, issueDate: string): Promise<string> {
  const year = issueDate.slice(0, 4)
  const lockKey = `invoice-number-${year}`

  await db.execute(sql`select pg_advisory_xact_lock(hashtext(${lockKey}))`)

  const [{ lastSequence }] = await db
    .select({
      lastSequence:
        sql<number>`coalesce(max(((regexp_match(${invoices.invoiceNumber}, ${`^INV-${year}-(\\d+)$`}))[1])::int), 0)`.mapWith(
          Number
        ),
    })
    .from(invoices)
    .where(like(invoices.invoiceNumber, `INV-${year}-%`))

  return `INV-${year}-${String((lastSequence ?? 0) + 1).padStart(3, '0')}`
}

function normalizeInvoiceLine(input: SaveInvoiceLineInput): SaveInvoiceLineInput {
  const description = input.description.trim()
  if (!description) {
    throw new DomainError('Invoice line description is required.', 'invalid_data')
  }

  if (!(input.quantity > 0)) {
    throw new DomainError('Invoice line quantity must be greater than 0.', 'invalid_data')
  }

  if (input.unitPrice < 0) {
    throw new DomainError('Invoice line unit price cannot be negative.', 'invalid_data')
  }

  if (input.vatRate < 0 || input.vatRate > 100) {
    throw new DomainError('Invoice line VAT rate must be between 0 and 100.', 'invalid_data')
  }

  return {
    description,
    quantity: input.quantity,
    unitPrice: input.unitPrice,
    vatRate: input.vatRate,
  }
}

function normalizeIssueInvoiceInput(input: IssueInvoiceInput): NormalizedIssueInvoiceInput {
  const issuedCompanyAddress = input.issuedCompanyAddress.trim()
  const issuedCompanyName = input.issuedCompanyName.trim()

  if (!issuedCompanyName || !issuedCompanyAddress) {
    throw new DomainError('Company name and company address are required to issue.', 'invalid_data')
  }

  return {
    issuedCompanyAddress,
    issuedCompanyName,
  }
}

function normalizeSaveInvoiceDraftInput(
  input: SaveInvoiceDraftInput
): NormalizedSaveInvoiceDraftInput {
  const customerId = input.customerId.trim()
  const dueDate = input.dueDate.trim()
  const issueDate = input.issueDate.trim()

  if (!customerId) {
    throw new DomainError('Customer is required.', 'invalid_data')
  }

  if (!issueDate || !isISODate(issueDate)) {
    throw new DomainError('Issue date is required.', 'invalid_data')
  }

  if (!dueDate || !isISODate(dueDate)) {
    throw new DomainError('Due date is required.', 'invalid_data')
  }

  if (input.lines.length === 0) {
    throw new DomainError('Provide at least one invoice line.', 'invalid_data')
  }

  const lines = input.lines.map((line) => normalizeInvoiceLine(line))

  return {
    customerId,
    dueDate,
    issueDate,
    lines,
  }
}

function toCustomerSnapshot(customer: {
  address: string
  company: string
  email: string
  name: string
  phone: string
}): InvoiceCustomerSnapshot {
  return {
    customerCompanyAddressSnapshot: customer.address,
    customerCompanySnapshot: customer.company,
    customerEmailSnapshot: customer.email,
    customerPhoneSnapshot: customer.phone,
    customerPrimaryContactSnapshot: customer.name,
  }
}

function toInvoiceDto(row: InvoiceRow, lines: InvoiceLineDto[], createdAt: string): InvoiceDto {
  return {
    createdAt,
    customerCompanyAddressSnapshot: row.customerCompanyAddressSnapshot,
    customerCompanyName: row.customerCompanyName,
    customerCompanySnapshot: row.customerCompanySnapshot,
    customerEmailSnapshot: row.customerEmailSnapshot,
    customerId: row.customerId,
    customerPhoneSnapshot: row.customerPhoneSnapshot,
    customerPrimaryContactSnapshot: row.customerPrimaryContactSnapshot,
    dueDate: row.dueDate,
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    issueDate: row.issueDate,
    issuedCompanyAddress: row.issuedCompanyAddress,
    issuedCompanyName: row.issuedCompanyName,
    lines,
    status: row.status as 'draft' | 'issued' | 'paid',
    subtotalExclTax: row.subtotalExclTaxCents / 100,
    totalInclTax: row.totalInclTaxCents / 100,
    totalVat: row.totalVatCents / 100,
  }
}

function toLineDto(row: InvoiceLineRow): InvoiceLineDto {
  return {
    description: row.description,
    id: row.id,
    lineTotalExclTax: row.lineTotalExclTaxCents / 100,
    lineTotalInclTax: row.lineTotalInclTaxCents / 100,
    lineVatAmount: row.lineTotalVatCents / 100,
    quantity: row.quantityCents / 100,
    unitPrice: row.unitPriceCents / 100,
    vatRate: row.vatRateCents / 100,
  }
}
