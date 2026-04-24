import type { AccountingAccessContext } from '#core/accounting/application/support/access_context'

import type { DateFilter, ExpenseSummary } from '../types.js'
import type { ExpenseStore } from './support/expense_store.js'

export function getExpenseSummaryUseCase(
  store: Pick<ExpenseStore, 'getSummary'>,
  access: AccountingAccessContext,
  dateFilter?: DateFilter
): Promise<ExpenseSummary> {
  return store.getSummary(access.tenantId, dateFilter)
}
