import type { AccountingAccessContext } from '#core/accounting/application/support/access_context'
import type { AccountingActivitySink } from '#core/accounting/application/support/activity_log'

export async function recordCustomerActivity(
  activitySink: AccountingActivitySink | undefined,
  access: AccountingAccessContext,
  operation: string,
  customerId: string
) {
  await activitySink?.record({
    actorId: access.actorId,
    boundedContext: 'accounting',
    isAnonymous: access.isAnonymous,
    operation,
    outcome: 'success',
    resourceId: customerId,
    resourceType: 'customer',
  })
}
