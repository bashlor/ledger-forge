import type { AccountingActivitySink } from '#core/accounting/application/support/activity_log'

import type { InvoiceRequestContext } from '../../types.js'

export async function recordInvoiceActivity(
  activitySink: AccountingActivitySink | undefined,
  requestContext: InvoiceRequestContext,
  operation: string,
  invoiceId: string
) {
  await activitySink?.record({
    actorId: requestContext.actorId,
    boundedContext: 'accounting',
    isAnonymous: requestContext.isAnonymous,
    operation,
    outcome: 'success',
    resourceId: invoiceId,
    resourceType: 'invoice',
  })
}
