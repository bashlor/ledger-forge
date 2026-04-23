import type { AccountingAccessContext } from '#core/accounting/application/support/access_context'

import { DomainError } from '#core/common/errors/domain_error'

import type { CreateCustomerInput, CustomerDto } from '../types.js'
import type { CustomerUseCaseDeps } from './support/customer_use_case_deps.js'

import { toCustomerDto } from '../mappers.js'
import {
  customerSnapshotChanged,
  normalizeCustomerMutationInput,
} from './support/customer_rules.js'
import { recordCustomerActivity } from './support/record_customer_activity.js'

export async function updateCustomerUseCase(
  deps: CustomerUseCaseDeps,
  id: string,
  input: CreateCustomerInput,
  access: AccountingAccessContext
): Promise<CustomerDto> {
  const existing = await deps.store.findById(id, access.tenantId)

  if (!existing) {
    throw new DomainError('Customer not found.', 'not_found')
  }

  const normalized = normalizeCustomerMutationInput(input)
  const snapshotChanged = customerSnapshotChanged(existing, normalized)
  const updated = await deps.store.updateById(id, normalized, access.tenantId)

  if (!updated) {
    throw new DomainError('Customer not found.', 'not_found')
  }

  if (snapshotChanged) {
    await deps.store.syncDraftInvoiceSnapshots(id, normalized, access.tenantId)
  }

  await deps.auditTrail.record(deps.auditExecutor, {
    action: 'update',
    actorId: access.actorId,
    changes: {
      after: {
        address: normalized.address,
        company: normalized.company,
        email: normalized.email,
        name: normalized.name,
        note: normalized.note,
        phone: normalized.phone,
      },
      before: {
        address: existing.address,
        company: existing.company,
        email: existing.email,
        name: existing.name,
        note: existing.note,
        phone: existing.phone,
      },
    },
    entityId: id,
    entityType: 'customer',
    tenantId: access.tenantId,
  })

  await recordCustomerActivity(deps.activitySink, access, 'update_customer', id)

  return toCustomerDto(updated, await deps.store.invoiceAggregateForCustomer(id, access.tenantId))
}
