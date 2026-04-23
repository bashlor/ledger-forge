import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import type { CustomerStore } from './application/support/customer_store.js'
import type { NormalizedCustomerInput } from './types.js'

import {
  deleteCustomerIfUnlinked,
  insertCustomer,
  syncDraftInvoiceCustomerSnapshots,
  updateCustomerById,
} from './commands.js'
import {
  customerStateForDelete,
  findCustomerById,
  invoiceAggregateForCustomer,
  listCustomersWithAggregates,
} from './queries.js'

type DrizzleDb = PostgresJsDatabase<any>
type DrizzleExecutor = DrizzleDb | Parameters<Parameters<DrizzleDb['transaction']>[0]>[0]

class DrizzleCustomerStore implements CustomerStore {
  constructor(private readonly executor: DrizzleExecutor) {}

  customerStateForDelete(id: string, tenantId: string) {
    return customerStateForDelete(this.executor, id, tenantId)
  }

  deleteIfUnlinked(id: string, tenantId: string) {
    return deleteCustomerIfUnlinked(this.executor, id, tenantId)
  }

  findById(id: string, tenantId: string) {
    return findCustomerById(this.executor, id, tenantId)
  }

  insert(
    input: NormalizedCustomerInput,
    actor: { createdBy: null | string; organizationId: string }
  ) {
    return insertCustomer(this.executor, input, actor)
  }

  invoiceAggregateForCustomer(customerId: string, tenantId: string) {
    return invoiceAggregateForCustomer(this.executor, customerId, tenantId)
  }

  listWithAggregates(page: number, perPage: number, tenantId: string, search?: string) {
    return listCustomersWithAggregates(this.executor, page, perPage, tenantId, search)
  }

  syncDraftInvoiceSnapshots(
    customerId: string,
    input: NormalizedCustomerInput,
    organizationId: string
  ) {
    return syncDraftInvoiceCustomerSnapshots(this.executor, customerId, input, organizationId)
  }

  updateById(id: string, input: NormalizedCustomerInput, organizationId: string) {
    return updateCustomerById(this.executor, id, input, organizationId)
  }
}

export function createDrizzleCustomerStore(executor: DrizzleExecutor): CustomerStore {
  return new DrizzleCustomerStore(executor)
}
