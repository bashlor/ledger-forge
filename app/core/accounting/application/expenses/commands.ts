import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { expenses, journalEntries } from '#core/accounting/drizzle/schema'
import { and, eq } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'

import type { NormalizedExpenseInput } from './types.js'

type DrizzleDb = PostgresJsDatabase<any>
type DrizzleTx = Parameters<Parameters<DrizzleDb['transaction']>[0]>[0]

export async function confirmDraftExpense(
  tx: DrizzleTx,
  id: string,
  organizationId?: null | string
) {
  const [updated] = await tx
    .update(expenses)
    .set({ status: 'confirmed' })
    .where(
      and(
        eq(expenses.id, id),
        eq(expenses.status, 'draft'),
        organizationId ? eq(expenses.organizationId, organizationId) : undefined
      )
    )
    .returning()
  return updated
}

export async function deleteDraftExpense(
  tx: DrizzleTx,
  id: string,
  organizationId?: null | string
): Promise<undefined | { id: string }> {
  const [deleted] = await tx
    .delete(expenses)
    .where(
      and(
        eq(expenses.id, id),
        eq(expenses.status, 'draft'),
        organizationId ? eq(expenses.organizationId, organizationId) : undefined
      )
    )
    .returning({ id: expenses.id })
  return deleted
}

export async function insertDraftExpense(
  tx: DrizzleDb,
  input: NormalizedExpenseInput,
  actor: { createdBy: null | string; organizationId: null | string }
) {
  const [row] = await tx
    .insert(expenses)
    .values({
      amountCents: input.amountCents,
      category: input.category,
      createdBy: actor.createdBy,
      date: input.date,
      id: uuidv7(),
      label: input.label,
      organizationId: actor.organizationId,
      status: 'draft',
    })
    .returning()
  return row
}

export async function insertExpenseJournalEntry(
  tx: DrizzleTx,
  input: { amountCents: number; date: string; expenseId: string; label: string }
) {
  await tx.insert(journalEntries).values({
    amountCents: input.amountCents,
    date: input.date,
    expenseId: input.expenseId,
    id: uuidv7(),
    label: input.label,
    type: 'expense',
  })
}
