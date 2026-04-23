import type { AccountingAccessContext } from '#core/accounting/application/support/access_context'

import type { CreateCustomerInput, CustomerDto } from '../types.js'
import type { CustomerUseCaseDeps } from './support/customer_use_case_deps.js'

import { toCustomerDto } from '../mappers.js'
import { normalizeCustomerMutationInput } from './support/customer_rules.js'
import { recordCustomerActivity } from './support/record_customer_activity.js'

export async function createCustomerUseCase(
  deps: CustomerUseCaseDeps,
  input: CreateCustomerInput,
  access: AccountingAccessContext
): Promise<CustomerDto> {
  const normalized = normalizeCustomerMutationInput(input)
  const created = await deps.store.insert(normalized, {
    createdBy: access.actorId ?? null,
    organizationId: access.tenantId,
  })

  await deps.auditTrail.record(deps.auditExecutor, {
    action: 'create',
    actorId: access.actorId,
    entityId: created.id,
    entityType: 'customer',
    tenantId: access.tenantId,
  })

  await recordCustomerActivity(deps.activitySink, access, 'create_customer', created.id)

  return toCustomerDto(created, { invoiceCount: 0, totalInvoicedCents: 0 })
}
