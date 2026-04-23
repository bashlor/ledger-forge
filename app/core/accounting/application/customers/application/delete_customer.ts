import type { AccountingAccessContext } from '#core/accounting/application/support/access_context'

import type { CustomerUseCaseDeps } from './support/customer_use_case_deps.js'

import { buildDeleteCustomerError } from './support/customer_rules.js'
import { recordCustomerActivity } from './support/record_customer_activity.js'

export async function deleteCustomerUseCase(
  deps: CustomerUseCaseDeps,
  id: string,
  access: AccountingAccessContext
): Promise<void> {
  const deleted = await deps.store.deleteIfUnlinked(id, access.tenantId)

  if (!deleted) {
    throw buildDeleteCustomerError(await deps.store.customerStateForDelete(id, access.tenantId))
  }

  await deps.auditTrail.record(deps.auditExecutor, {
    action: 'delete',
    actorId: access.actorId,
    entityId: id,
    entityType: 'customer',
    tenantId: access.tenantId,
  })

  await recordCustomerActivity(deps.activitySink, access, 'delete_customer', id)
}
