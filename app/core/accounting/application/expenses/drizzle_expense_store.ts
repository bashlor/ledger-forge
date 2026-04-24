import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import type { ExpenseStore } from './application/support/expense_store.js'
import type { DateFilter, NormalizedExpenseInput } from './types.js'

import {
  confirmDraftExpense,
  deleteDraftExpense,
  insertDraftExpense,
  insertExpenseJournalEntry,
} from './commands.js'
import { findExpenseById, getExpenseSummary, listExpenseRows } from './queries.js'

type DrizzleDb = PostgresJsDatabase<any>
type DrizzleExecutor = DrizzleDb | Parameters<Parameters<DrizzleDb['transaction']>[0]>[0]

class DrizzleExpenseStore implements ExpenseStore {
  constructor(private readonly executor: DrizzleExecutor) {}

  confirmDraft(id: string, tenantId: string) {
    return confirmDraftExpense(this.executor, id, tenantId)
  }

  deleteDraft(id: string, tenantId: string) {
    return deleteDraftExpense(this.executor, id, tenantId)
  }

  findById(id: string, tenantId: string) {
    return findExpenseById(this.executor, id, tenantId)
  }

  getSummary(tenantId: string, filter?: DateFilter) {
    return getExpenseSummary(this.executor, tenantId, filter)
  }

  insertDraft(
    input: NormalizedExpenseInput,
    actor: { createdBy: null | string; organizationId: string }
  ) {
    return insertDraftExpense(this.executor, input, actor)
  }

  insertJournalEntry(input: {
    amountCents: number
    date: string
    expenseId: string
    label: string
    organizationId: string
  }) {
    return insertExpenseJournalEntry(this.executor, input)
  }

  list(page: number, perPage: number, tenantId: string, filter?: DateFilter, search?: string) {
    return listExpenseRows(this.executor, page, perPage, tenantId, filter, search)
  }
}

export function createDrizzleExpenseStore(executor: DrizzleExecutor): ExpenseStore {
  return new DrizzleExpenseStore(executor)
}
