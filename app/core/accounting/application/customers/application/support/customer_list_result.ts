import { fromCents } from '#core/shared/money'

import type { CustomerListResult } from '../../types.js'
import type { CustomerListReadModel } from './customer_store.js'

import { toCustomerDto } from '../../mappers.js'

export function toCustomerListResult(readModel: CustomerListReadModel): CustomerListResult {
  if (readModel.rows.length === 0) {
    return {
      items: [],
      pagination: readModel.pagination,
      summary: {
        linkedCustomers: readModel.linkedCustomers,
        totalCount: readModel.pagination.totalItems,
        totalInvoiced: fromCents(Number(readModel.totalInvoicedCents ?? 0)),
      },
    }
  }

  return {
    items: readModel.rows.map((row) => {
      const aggregate = readModel.aggregatesByCustomerId.get(row.id) ?? {
        invoiceCount: 0,
        totalInvoicedCents: 0,
      }
      return toCustomerDto(row, aggregate)
    }),
    pagination: readModel.pagination,
    summary: {
      linkedCustomers: readModel.linkedCustomers,
      totalCount: readModel.pagination.totalItems,
      totalInvoiced: fromCents(Number(readModel.totalInvoicedCents ?? 0)),
    },
  }
}
