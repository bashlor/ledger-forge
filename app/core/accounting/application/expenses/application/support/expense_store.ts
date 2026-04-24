import type {
  DateFilter,
  ExpenseListResult,
  ExpenseRow,
  ExpenseSummary,
  NormalizedExpenseInput,
} from '../../types.js'

export interface ExpenseStore {
  confirmDraft(id: string, tenantId: string): Promise<ExpenseRow | undefined>
  deleteDraft(id: string, tenantId: string): Promise<undefined | { id: string }>
  findById(id: string, tenantId: string): Promise<ExpenseRow | undefined>
  getSummary(tenantId: string, filter?: DateFilter): Promise<ExpenseSummary>
  insertDraft(
    input: NormalizedExpenseInput,
    actor: { createdBy: null | string; organizationId: string }
  ): Promise<ExpenseRow>
  insertJournalEntry(input: {
    amountCents: number
    date: string
    expenseId: string
    label: string
    organizationId: string
  }): Promise<void>
  list(
    page: number,
    perPage: number,
    tenantId: string,
    filter?: DateFilter,
    search?: string
  ): Promise<{ pagination: ExpenseListResult['pagination']; rows: ExpenseRow[] }>
}
