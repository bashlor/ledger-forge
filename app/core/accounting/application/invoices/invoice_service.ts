import type { DateFilter } from '#core/accounting/application/expenses/index'
import type { AccountingActivitySink } from '#core/accounting/application/support/activity_log'
import type { AccountingServiceDependencies } from '#core/accounting/application/support/service_dependencies'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import {
  type AccountingAccessContext,
  SYSTEM_ACCOUNTING_ACCESS_CONTEXT,
} from '#core/accounting/application/support/access_context'
import {
  type AccountingBusinessCalendar,
  SystemAccountingBusinessCalendar,
} from '#core/accounting/application/support/business_calendar'
import { customers, invoiceLines, invoices, journalEntries } from '#core/accounting/drizzle/schema'
import { DomainError } from '#core/shared/domain_error'
import { and, count, desc, eq, gte, inArray, like, lte, sql } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'

import type {
  CustomerForSelectDto,
  InvoiceConcurrencyHooks,
  InvoiceDto,
  InvoiceLineDto,
  InvoiceListResult,
  InvoiceListScopeInput,
  InvoiceRow,
  InvoiceSummaryDto,
  IssueInvoiceInput,
  SaveInvoiceDraftInput,
} from './types.js'

import { calculateLine, calculateTotals, fromDisplayUnits } from './calculations.js'
import { toCustomerSnapshot, toInvoiceDto, toLineDto } from './mappers.js'
import {
  assertDueDateIsNotBefore,
  assertInvoiceCanBeDeleted,
  assertInvoiceCanBeIssued,
  assertInvoiceCanBeMarkedPaid,
  assertInvoiceCanBeUpdated,
  assertInvoiceDates,
  normalizeIssueInvoiceInput,
  normalizeSaveInvoiceDraftInput,
} from './validation.js'

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
          dueDate: normalized.dueDate,
          id: invoiceId,
          invoiceNumber,
          issueDate: normalized.issueDate,
          issuedCompanyAddress: '',
          issuedCompanyName: '',
          status: 'draft',
          ...toCustomerSnapshot(customer),
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
          .select({ id: invoices.id, status: invoices.status })
          .from(invoices)
          .where(eq(invoices.id, id))
        if (!again) {
          throw new DomainError('Invoice not found.', 'not_found')
        }
        assertInvoiceCanBeDeleted(again.status)
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
      assertInvoiceCanBeIssued(existing.status)
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
        assertInvoiceCanBeIssued(again.status)
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
      const lines = lineRows.filter((line) => line.invoiceId === invoice.id).map(toLineDto)
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
      assertInvoiceCanBeMarkedPaid(existing.status)
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
        assertInvoiceCanBeMarkedPaid(again.status)
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
      assertInvoiceCanBeUpdated(existing.status)
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
          dueDate: normalized.dueDate,
          issueDate: normalized.issueDate,
          issuedCompanyAddress: existing.issuedCompanyAddress,
          issuedCompanyName: existing.issuedCompanyName,
          ...toCustomerSnapshot(customer),
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
        assertInvoiceCanBeUpdated(again.status)
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

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  const normalized = Math.trunc(value)
  return Math.min(Math.max(normalized, min), max)
}

function invoiceDateCondition(filter?: DateFilter) {
  if (!filter) return undefined
  return and(gte(invoices.issueDate, filter.startDate), lte(invoices.issueDate, filter.endDate))
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
