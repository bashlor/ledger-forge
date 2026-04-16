import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { customers, invoiceLines, invoices, journalEntries } from '#core/accounting/drizzle/schema'
import { DomainError } from '#core/shared/domain_error'
import { and, desc, eq, inArray, like, sql } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'

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
type InvoiceRow = typeof invoices.$inferSelect

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class InvoiceService {
  constructor(private readonly db: PostgresJsDatabase<any>) {}

  async createDraft(input: SaveInvoiceDraftInput): Promise<InvoiceDto> {
    return this.db.transaction(async (tx) => {
      assertInvoiceDates(input.issueDate, input.dueDate)
      const draftCreationDate = new Date().toISOString().slice(0, 10)
      assertDueDateIsNotBefore(
        input.dueDate,
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
        .where(eq(customers.id, input.customerId))

      if (!customer) throw new DomainError('Customer not found.', 'not_found')

      const invoiceNumber = await nextInvoiceNumber(tx, input.issueDate)
      const invoiceId = uuidv7()

      const lineInputs = input.lines.map(fromDisplayUnits)
      const lineCalcs = lineInputs.map(calculateLine)
      const totals = calculateTotals(lineCalcs)

      const [invoice] = await tx
        .insert(invoices)
        .values({
          customerCompanyName: customer.company,
          customerId: input.customerId,
          issuedCompanyAddress: '',
          issuedCompanyName: '',
          ...toCustomerSnapshot(customer),
          dueDate: input.dueDate,
          id: invoiceId,
          invoiceNumber,
          issueDate: input.issueDate,
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

      return toInvoiceDto(invoice, insertedLines.map(toLineDto))
    })
  }

  async deleteDraft(id: string): Promise<void> {
    return this.db.transaction(async (tx) => {
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
  }

  async issueInvoice(
    id: string,
    input: IssueInvoiceInput,
    hooks?: InvoiceConcurrencyHooks
  ): Promise<InvoiceDto> {
    return this.db.transaction(async (tx) => {
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
      const issuedCompanyName = input.issuedCompanyName.trim()
      const issuedCompanyAddress = input.issuedCompanyAddress.trim()
      if (!issuedCompanyName || !issuedCompanyAddress) {
        throw new DomainError(
          'Company name and company address are required to issue.',
          'business_logic_error'
        )
      }
      const today = new Date().toISOString().slice(0, 10)
      assertDueDateIsNotBefore(
        existing.dueDate,
        today,
        'Due date must be today or later to issue an invoice.'
      )

      const [updated] = await tx
        .update(invoices)
        .set({
          customerCompanyName: customer.company,
          issuedCompanyAddress,
          issuedCompanyName,
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

      return toInvoiceDto(updated, lineRows.map(toLineDto))
    })
  }

  async listCustomersForSelect(): Promise<CustomerForSelectDto[]> {
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

  async listInvoices(): Promise<InvoiceDto[]> {
    const invoiceRows = await this.db
      .select()
      .from(invoices)
      .orderBy(desc(invoices.issueDate), desc(invoices.invoiceNumber))
      .limit(500)

    if (invoiceRows.length === 0) return []

    const invoiceIds = invoiceRows.map((r) => r.id)
    const lineRows = await this.db
      .select()
      .from(invoiceLines)
      .where(inArray(invoiceLines.invoiceId, invoiceIds))
      .orderBy(invoiceLines.invoiceId, invoiceLines.lineNumber)

    return invoiceRows.map((invoice) => {
      const lines = lineRows.filter((l) => l.invoiceId === invoice.id).map(toLineDto)
      return toInvoiceDto(invoice, lines)
    })
  }

  async markInvoicePaid(id: string, hooks?: InvoiceConcurrencyHooks): Promise<InvoiceDto> {
    return this.db.transaction(async (tx) => {
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

      return toInvoiceDto(updated, lineRows.map(toLineDto))
    })
  }

  async updateDraft(
    id: string,
    input: SaveInvoiceDraftInput,
    hooks?: InvoiceConcurrencyHooks
  ): Promise<InvoiceDto> {
    return this.db.transaction(async (tx) => {
      assertInvoiceDates(input.issueDate, input.dueDate)

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
      const draftCreationDate = existing.createdAt.toISOString().slice(0, 10)
      assertDueDateIsNotBefore(
        input.dueDate,
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
        .where(eq(customers.id, input.customerId))

      if (!customer) throw new DomainError('Customer not found.', 'not_found')

      const lineInputs = input.lines.map(fromDisplayUnits)
      const lineCalcs = lineInputs.map(calculateLine)
      const totals = calculateTotals(lineCalcs)

      const [updated] = await tx
        .update(invoices)
        .set({
          customerCompanyName: customer.company,
          customerId: input.customerId,
          issuedCompanyAddress: existing.issuedCompanyAddress,
          issuedCompanyName: existing.issuedCompanyName,
          ...toCustomerSnapshot(customer),
          dueDate: input.dueDate,
          issueDate: input.issueDate,
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

      return toInvoiceDto(updated, insertedLines.map(toLineDto))
    })
  }
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function assertDueDateIsNotBefore(dueDate: string, minDate: string, message: string) {
  if (!dueDate || dueDate < minDate) {
    throw new DomainError(message, 'business_logic_error')
  }
}

function assertInvoiceDates(issueDate: string, dueDate: string) {
  if (dueDate < issueDate) {
    throw new DomainError('Due date cannot be before the issue date.', 'business_logic_error')
  }
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

function toInvoiceDto(row: InvoiceRow, lines: InvoiceLineDto[]): InvoiceDto {
  return {
    createdAt: row.createdAt.toISOString().slice(0, 10),
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
