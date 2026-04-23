import type { CustomerAggregate, CustomerRow, NormalizedCustomerInput } from '../../types.js'

export interface CustomerListReadModel {
  aggregatesByCustomerId: Map<string, CustomerAggregate>
  linkedCustomers: number
  pagination: { page: number; perPage: number; totalItems: number; totalPages: number }
  rows: CustomerRow[]
  totalInvoicedCents: number
}

export interface CustomerStore {
  customerStateForDelete(
    id: string,
    tenantId: string
  ): Promise<undefined | { id: string; invoiceCount: number }>
  deleteIfUnlinked(id: string, tenantId: string): Promise<undefined | { id: string }>
  findById(id: string, tenantId: string): Promise<CustomerRow | undefined>
  insert(
    input: NormalizedCustomerInput,
    actor: { createdBy: null | string; organizationId: string }
  ): Promise<CustomerRow>
  invoiceAggregateForCustomer(customerId: string, tenantId: string): Promise<CustomerAggregate>
  listWithAggregates(
    page: number,
    perPage: number,
    tenantId: string,
    search?: string
  ): Promise<CustomerListReadModel>
  syncDraftInvoiceSnapshots(
    customerId: string,
    input: NormalizedCustomerInput,
    organizationId: string
  ): Promise<void>
  updateById(
    id: string,
    input: NormalizedCustomerInput,
    organizationId: string
  ): Promise<CustomerRow | undefined>
}
