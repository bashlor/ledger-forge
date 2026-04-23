import type { AccountingAccessContext } from '#core/accounting/application/support/access_context'

import type { CreateExpenseInput, ExpenseDto } from '../types.js'
import type { ExpenseUseCaseDeps } from './support/expense_use_case_deps.js'

import { toExpenseDto } from '../mappers.js'
import { normalizeExpenseMutationInput } from './support/expense_rules.js'
import { recordExpenseActivity } from './support/record_expense_activity.js'

export async function createExpenseUseCase(
  deps: ExpenseUseCaseDeps,
  input: CreateExpenseInput,
  access: AccountingAccessContext
): Promise<ExpenseDto> {
  const normalized = normalizeExpenseMutationInput(input)
  const created = await deps.store.insertDraft(normalized, {
    createdBy: access.actorId ?? null,
    organizationId: access.tenantId,
  })

  await deps.auditTrail.record(deps.auditExecutor, {
    action: 'create',
    actorId: access.actorId,
    entityId: created.id,
    entityType: 'expense',
    tenantId: access.tenantId,
  })

  await recordExpenseActivity(deps.activitySink, access, 'create_expense', created.id)

  return toExpenseDto(created)
}
