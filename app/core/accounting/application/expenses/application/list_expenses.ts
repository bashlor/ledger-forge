import type { AccountingAccessContext } from '#core/accounting/application/support/access_context'

import type { DateFilter, ExpenseListResult } from '../types.js'
import type { ExpenseStore } from './support/expense_store.js'

import { toExpenseDto } from '../mappers.js'
import { normalizeExpenseListInput } from './support/expense_rules.js'

export async function listExpensesUseCase(
  store: Pick<ExpenseStore, 'list'>,
  page: number,
  perPage: number,
  access: AccountingAccessContext,
  dateFilter?: DateFilter,
  search?: string
): Promise<ExpenseListResult> {
  const normalized = normalizeExpenseListInput(page, perPage, search)
  const { pagination, rows } = await store.list(
    normalized.page,
    normalized.perPage,
    access.tenantId,
    dateFilter,
    normalized.search
  )

  return {
    items: rows.map(toExpenseDto),
    pagination,
  }
}
