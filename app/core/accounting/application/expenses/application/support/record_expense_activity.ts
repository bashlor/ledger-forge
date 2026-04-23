import type { AccountingAccessContext } from '#core/accounting/application/support/access_context'
import type { AccountingActivitySink } from '#core/accounting/application/support/activity_log'

export async function recordExpenseActivity(
  activitySink: AccountingActivitySink | undefined,
  access: AccountingAccessContext,
  operation: string,
  expenseId: string
) {
  await activitySink?.record({
    actorId: access.actorId,
    boundedContext: 'accounting',
    isAnonymous: access.isAnonymous,
    operation,
    outcome: 'success',
    resourceId: expenseId,
    resourceType: 'expense',
  })
}
