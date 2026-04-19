import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { invoiceLines, invoices, journalEntries } from '#core/accounting/drizzle/schema'
import { and, eq } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'

import type { InvoiceStatus } from '../types.js'

type DrizzleDb = PostgresJsDatabase<any>
type DrizzleTx = Parameters<Parameters<DrizzleDb['transaction']>[0]>[0]

type InvoiceInsert = typeof invoices.$inferInsert
type InvoiceLineInsert = typeof invoiceLines.$inferInsert
type InvoiceUpdate = Partial<typeof invoices.$inferInsert>

export async function deleteDraftInvoice(
  tx: DrizzleTx,
  id: string
): Promise<undefined | { id: string }> {
  const [deleted] = await tx
    .delete(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.status, 'draft')))
    .returning({ id: invoices.id })
  return deleted
}

export async function insertInvoice(tx: DrizzleTx, values: InvoiceInsert) {
  const [row] = await tx.insert(invoices).values(values).returning()
  return row
}

export async function insertInvoiceJournalEntry(
  tx: DrizzleTx,
  input: { amountCents: number; date: string; invoiceId: string; label: string }
) {
  await tx.insert(journalEntries).values({
    amountCents: input.amountCents,
    date: input.date,
    id: uuidv7(),
    invoiceId: input.invoiceId,
    label: input.label,
    type: 'invoice',
  })
}

export async function insertInvoiceLine(tx: DrizzleTx, values: InvoiceLineInsert) {
  const [row] = await tx.insert(invoiceLines).values(values).returning()
  return row
}

export async function insertInvoiceLines(tx: DrizzleTx, values: InvoiceLineInsert[]) {
  if (values.length === 0) return []
  return tx.insert(invoiceLines).values(values).returning()
}

export async function replaceInvoiceLines(
  tx: DrizzleTx,
  invoiceId: string,
  values: Omit<InvoiceLineInsert, 'id' | 'invoiceId'>[]
) {
  await tx.delete(invoiceLines).where(eq(invoiceLines.invoiceId, invoiceId))
  if (values.length === 0) return []

  const rows = values.map((line) => ({
    ...line,
    id: uuidv7(),
    invoiceId,
  }))
  return tx.insert(invoiceLines).values(rows).returning()
}

export async function updateInvoice(tx: DrizzleTx, id: string, values: InvoiceUpdate) {
  const [row] = await tx.update(invoices).set(values).where(eq(invoices.id, id)).returning()
  return row
}

export async function updateInvoiceDraft(tx: DrizzleTx, id: string, values: InvoiceUpdate) {
  const [row] = await tx
    .update(invoices)
    .set(values)
    .where(and(eq(invoices.id, id), eq(invoices.status, 'draft')))
    .returning()
  return row
}

export async function updateInvoiceStatus(
  tx: DrizzleTx,
  id: string,
  expectedStatus: InvoiceStatus,
  nextStatus: InvoiceStatus
) {
  const [row] = await tx
    .update(invoices)
    .set({ status: nextStatus })
    .where(and(eq(invoices.id, id), eq(invoices.status, expectedStatus)))
    .returning()
  return row
}
