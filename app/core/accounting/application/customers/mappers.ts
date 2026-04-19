import type { CustomerAggregate, CustomerDto, CustomerRow } from './types.js'

export function toCustomerDto(row: CustomerRow, aggregate: CustomerAggregate): CustomerDto {
  const canDelete = aggregate.invoiceCount === 0
  return {
    address: row.address,
    canDelete,
    company: row.company,
    deleteBlockReason: canDelete
      ? undefined
      : 'This customer is referenced by one or more invoices.',
    email: row.email,
    id: row.id,
    invoiceCount: aggregate.invoiceCount,
    name: row.name,
    note: row.note ?? undefined,
    phone: row.phone,
    totalInvoiced: aggregate.totalInvoicedCents / 100,
  }
}
