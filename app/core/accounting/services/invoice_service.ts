import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { customers, invoiceLines, invoices, journalEntries } from '#core/accounting/drizzle/schema'
import { DomainError } from '#core/shared/domain_error'
import { and, count, desc, eq, gte, inArray, lte } from 'drizzle-orm'
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

export interface InvoiceDto {
  customerId: string
  customerName: string
  dueDate: string
  id: string
  invoiceNumber: string
  issueDate: string
  lines: InvoiceLineDto[]
  status: 'draft' | 'issued' | 'paid'
  subtotalExclTax: number
  totalInclTax: number
  totalVat: number
}

// ---------------------------------------------------------------------------
// DTO types (match inertia/lib/types.ts shapes for Inertia props)
// ---------------------------------------------------------------------------

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

export interface SaveInvoiceDraftInput {
  customerId: string
  dueDate: string
  issueDate: string
  lines: SaveInvoiceLineInput[]
}

export interface SaveInvoiceLineInput {
  description: string
  quantity: number
  unitPrice: number
  vatRate: number
}

// ---------------------------------------------------------------------------
// Row types inferred from schema
// ---------------------------------------------------------------------------

type InvoiceLineRow = typeof invoiceLines.$inferSelect
type InvoiceRow = typeof invoices.$inferSelect

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class InvoiceService {
  constructor(private readonly db: PostgresJsDatabase<any>) {}

  async createDraft(input: SaveInvoiceDraftInput): Promise<InvoiceDto> {
    return this.db.transaction(async (tx) => {
      const [customer] = await tx
        .select({ company: customers.company, id: customers.id })
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
          customerId: input.customerId,
          customerName: customer.company,
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
        quantityCents: line.quantityCents,
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
      const [existing] = await tx.select().from(invoices).where(eq(invoices.id, id))

      if (!existing) {
        throw new DomainError('Invoice not found.', 'not_found')
      }

      if (existing.status !== 'draft') {
        throw new DomainError('Only draft invoices can be deleted.', 'business_logic_error')
      }

      await tx.delete(invoices).where(eq(invoices.id, id)).returning({ id: invoices.id })
    })
  }

  async issueInvoice(id: string): Promise<InvoiceDto> {
    return this.db.transaction(async (tx) => {
      const [existing] = await tx.select().from(invoices).where(eq(invoices.id, id))
      if (!existing) {
        throw new DomainError('Invoice not found.', 'not_found')
      }

      if (existing.status !== 'draft') {
        throw new DomainError('Only draft invoices can be issued.', 'business_logic_error')
      }

      const [updated] = await tx
        .update(invoices)
        .set({ status: 'issued' })
        .where(and(eq(invoices.id, id), eq(invoices.status, 'draft')))
        .returning()

      await tx.insert(journalEntries).values({
        amountCents: updated.totalInclTaxCents,
        date: updated.issueDate ?? updated.createdAt.toISOString().slice(0, 10),
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

  async markInvoicePaid(id: string): Promise<InvoiceDto> {
    return this.db.transaction(async (tx) => {
      const [existing] = await tx.select().from(invoices).where(eq(invoices.id, id))
      if (!existing) {
        throw new DomainError('Invoice not found.', 'not_found')
      }
      if (existing.status !== 'issued') {
        throw new DomainError('Only issued invoices can be marked as paid.', 'business_logic_error')
      }

      const [updated] = await tx
        .update(invoices)
        .set({ status: 'paid' })
        .where(and(eq(invoices.id, id), eq(invoices.status, 'issued')))
        .returning()

      const lineRows = await tx
        .select()
        .from(invoiceLines)
        .where(eq(invoiceLines.invoiceId, id))
        .orderBy(invoiceLines.lineNumber)

      return toInvoiceDto(updated, lineRows.map(toLineDto))
    })
  }

  async updateDraft(id: string, input: SaveInvoiceDraftInput): Promise<InvoiceDto> {
    return this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ status: invoices.status })
        .from(invoices)
        .where(eq(invoices.id, id))

      if (!existing) throw new DomainError('Invoice not found.', 'not_found')
      if (existing.status !== 'draft') {
        throw new DomainError('Only draft invoices can be edited.', 'business_logic_error')
      }

      const [customer] = await tx
        .select({ company: customers.company })
        .from(customers)
        .where(eq(customers.id, input.customerId))

      if (!customer) throw new DomainError('Customer not found.', 'not_found')

      const lineInputs = input.lines.map(fromDisplayUnits)
      const lineCalcs = lineInputs.map(calculateLine)
      const totals = calculateTotals(lineCalcs)

      const [updated] = await tx
        .update(invoices)
        .set({
          customerId: input.customerId,
          customerName: customer.company,
          dueDate: input.dueDate,
          issueDate: input.issueDate,
          ...totals,
        })
        .where(eq(invoices.id, id))
        .returning()

      await tx.delete(invoiceLines).where(eq(invoiceLines.invoiceId, id))

      const lineValues = lineInputs.map((line, i) => ({
        description: line.description,
        id: uuidv7(),
        invoiceId: id,
        lineNumber: i + 1,
        quantityCents: line.quantityCents,
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

async function nextInvoiceNumber(db: any, issueDate: string): Promise<string> {
  const year = issueDate.slice(0, 4)
  const [{ total }] = await db
    .select({ total: count() })
    .from(invoices)
    .where(and(gte(invoices.issueDate, `${year}-01-01`), lte(invoices.issueDate, `${year}-12-31`)))
  return `INV-${year}-${String(Number(total) + 1).padStart(3, '0')}`
}

function toInvoiceDto(row: InvoiceRow, lines: InvoiceLineDto[]): InvoiceDto {
  return {
    customerId: row.customerId,
    customerName: row.customerName,
    dueDate: row.dueDate ?? '',
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    issueDate: row.issueDate ?? '',
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
