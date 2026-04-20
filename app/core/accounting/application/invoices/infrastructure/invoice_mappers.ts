import { fromCents } from '#core/shared/money'

import type {
  CustomerSnapshotSource,
  InvoiceCustomerSnapshot,
  InvoiceDto,
  InvoiceLineDto,
  InvoiceLineRow,
  InvoiceRow,
} from '../types.js'

export function toCustomerSnapshot(customer: CustomerSnapshotSource): InvoiceCustomerSnapshot {
  return {
    customerCompanyAddressSnapshot: customer.address,
    customerCompanySnapshot: customer.company,
    customerEmailSnapshot: customer.email,
    customerPhoneSnapshot: customer.phone,
    customerPrimaryContactSnapshot: customer.name,
  }
}

export function toInvoiceDto(
  row: InvoiceRow,
  lines: InvoiceLineDto[],
  createdAt: string
): InvoiceDto {
  return {
    createdAt,
    customerCompanyAddressSnapshot: row.customerCompanyAddressSnapshot,
    customerCompanyName: row.customerCompanyName,
    customerCompanySnapshot: row.customerCompanySnapshot,
    customerEmailSnapshot: row.customerEmailSnapshot,
    customerId: row.customerId,
    customerPhoneSnapshot: row.customerPhoneSnapshot,
    customerPrimaryContactSnapshot: row.customerPrimaryContactSnapshot,
    dueDate: row.dueDate,
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    issueDate: row.issueDate,
    issuedCompanyAddress: row.issuedCompanyAddress,
    issuedCompanyName: row.issuedCompanyName,
    lines,
    status: row.status,
    subtotalExclTax: fromCents(row.subtotalExclTaxCents),
    totalInclTax: fromCents(row.totalInclTaxCents),
    totalVat: fromCents(row.totalVatCents),
  }
}

export function toLineDto(row: InvoiceLineRow): InvoiceLineDto {
  return {
    description: row.description,
    id: row.id,
    lineTotalExclTax: fromCents(row.lineTotalExclTaxCents),
    lineTotalInclTax: fromCents(row.lineTotalInclTaxCents),
    lineVatAmount: fromCents(row.lineTotalVatCents),
    quantity: fromCents(row.quantityCents),
    unitPrice: fromCents(row.unitPriceCents),
    vatRate: fromCents(row.vatRateCents),
  }
}
