import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { expenses, journalEntries } from '#core/accounting/drizzle/schema'
import { and, eq } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'

import type { NormalizedExpenseInput } from './types.js'

type DrizzleDb = PostgresJsDatabase<any>
type DrizzleExecutor = DrizzleDb | DrizzleTx
type DrizzleTx = Parameters<Parameters<DrizzleDb['transaction']>[0]>[0]

export async function confirmDraftExpense(
  executor: DrizzleExecutor,
  id: string,
  organizationId: string
) {
  const [updated] = await executor
    .update(expenses)
    .set({ status: 'confirmed' })
    .where(
      and(
        eq(expenses.id, id),
        eq(expenses.status, 'draft'),
        eq(expenses.organizationId, organizationId)
      )
    )
    .returning()
  return updated
}

export async function deleteDraftExpense(
  executor: DrizzleExecutor,
  id: string,
  organizationId: string
): Promise<undefined | { id: string }> {
  const [deleted] = await executor
    .delete(expenses)
    .where(
      and(
        eq(expenses.id, id),
        eq(expenses.status, 'draft'),
        eq(expenses.organizationId, organizationId)
      )
    )
    .returning({ id: expenses.id })
  return deleted
}

export async function insertDraftExpense(
  executor: DrizzleExecutor,
  input: NormalizedExpenseInput,
  actor: { createdBy: null | string; organizationId: string }
) {
  const [row] = await executor
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
  executor: DrizzleExecutor,
  input: {
    amountCents: number
    date: string
    expenseId: string
    label: string
    organizationId: string
  }
) {
  await executor.insert(journalEntries).values({
    amountCents: input.amountCents,
    date: input.date,
    expenseId: input.expenseId,
    id: uuidv7(),
    label: input.label,
    organizationId: input.organizationId,
    type: 'expense',
  })
}
