import type { AccountingAccessContext } from '#core/accounting/application/support/access_context'

import type { ExpenseConcurrencyHooks, ExpenseDto } from '../types.js'
import type { ExpenseUseCaseDeps } from './support/expense_use_case_deps.js'

import { toExpenseDto } from '../mappers.js'
import { buildConfirmExpenseError } from './support/expense_rules.js'
import { recordExpenseActivity } from './support/record_expense_activity.js'

export async function confirmExpenseUseCase(
  deps: ExpenseUseCaseDeps,
  id: string,
  access: AccountingAccessContext,
  hooks?: ExpenseConcurrencyHooks
): Promise<ExpenseDto> {
  const existing = await deps.store.findById(id, access.tenantId)
  if (!existing) {
    throw buildConfirmExpenseError(existing)
  }

  await hooks?.afterRead?.()

  const updated = await deps.store.confirmDraft(id, access.tenantId)

  if (!updated) {
    throw buildConfirmExpenseError(await deps.store.findById(id, access.tenantId))
  }

  await deps.store.insertJournalEntry({
    amountCents: updated.amountCents,
    date: updated.date,
    expenseId: updated.id,
    label: updated.label,
    organizationId: access.tenantId,
  })

  await deps.auditTrail.record(deps.auditExecutor, {
    action: 'confirm',
    actorId: access.actorId,
    changes: { after: { status: 'confirmed' }, before: { status: existing.status } },
    entityId: updated.id,
    entityType: 'expense',
    tenantId: access.tenantId,
  })

  await recordExpenseActivity(deps.activitySink, access, 'confirm_expense', id)

  return toExpenseDto(updated)
}
