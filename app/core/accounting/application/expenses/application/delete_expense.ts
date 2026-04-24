import type { AccountingAccessContext } from '#core/accounting/application/support/access_context'

import type { ExpenseConcurrencyHooks } from '../types.js'
import type { ExpenseUseCaseDeps } from './support/expense_use_case_deps.js'

import { buildDeleteExpenseError } from './support/expense_rules.js'
import { recordExpenseActivity } from './support/record_expense_activity.js'

export async function deleteExpenseUseCase(
  deps: ExpenseUseCaseDeps,
  id: string,
  access: AccountingAccessContext,
  hooks?: ExpenseConcurrencyHooks
): Promise<void> {
  const existing = await deps.store.findById(id, access.tenantId)
  if (!existing) {
    throw buildDeleteExpenseError(existing)
  }

  await hooks?.afterRead?.()

  const deleted = await deps.store.deleteDraft(id, access.tenantId)

  if (!deleted) {
    throw buildDeleteExpenseError(await deps.store.findById(id, access.tenantId))
  }

  await deps.auditTrail.record(deps.auditExecutor, {
    action: 'delete',
    actorId: access.actorId,
    entityId: id,
    entityType: 'expense',
    tenantId: access.tenantId,
  })

  await recordExpenseActivity(deps.activitySink, access, 'delete_expense', id)
}
