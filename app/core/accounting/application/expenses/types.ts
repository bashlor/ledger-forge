import type { expenses } from '#core/accounting/drizzle/schema'
import type { ExpenseCategory } from '#core/accounting/expense_categories'

export type { DateFilter } from '#core/accounting/application/support/date_filter_types'
export type { ExpenseCategory } from '#core/accounting/expense_categories'

export interface CreateExpenseInput {
  amount: number
  category: string
  date: string
  label: string
}

export interface ExpenseConcurrencyHooks {
  afterRead?: () => Promise<void>
}

export interface ExpenseDto {
  amount: number
  canConfirm: boolean
  canDelete: boolean
  category: string
  date: string
  id: string
  label: string
  status: 'confirmed' | 'draft'
}

export interface ExpenseListResult {
  items: ExpenseDto[]
  pagination: {
    page: number
    perPage: number
    totalItems: number
    totalPages: number
  }
}

export type ExpenseRow = typeof expenses.$inferSelect

export interface ExpenseSummary {
  confirmedCount: number
  draftCount: number
  totalAmount: number
  totalCount: number
}

export interface NormalizedExpenseInput {
  amountCents: number
  category: ExpenseCategory
  date: string
  label: string
}
