import type { AccountingAccessContext } from '#core/accounting/application/support/access_context'

import type { CustomerListResult } from '../types.js'
import type { CustomerStore } from './support/customer_store.js'

import { toCustomerListResult } from './support/customer_list_result.js'
import { normalizeCustomerListInput } from './support/customer_rules.js'

export async function listCustomersPageUseCase(
  store: Pick<CustomerStore, 'listWithAggregates'>,
  page: number,
  perPage: number,
  access: AccountingAccessContext,
  search?: string
): Promise<CustomerListResult> {
  const normalized = normalizeCustomerListInput(page, perPage, search)
  return toCustomerListResult(
    await store.listWithAggregates(
      normalized.page,
      normalized.perPage,
      access.tenantId,
      normalized.search
    )
  )
}
