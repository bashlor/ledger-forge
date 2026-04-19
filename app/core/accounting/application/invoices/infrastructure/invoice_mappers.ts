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
    subtotalExclTax: row.subtotalExclTaxCents / 100,
    totalInclTax: row.totalInclTaxCents / 100,
    totalVat: row.totalVatCents / 100,
  }
}

export function toLineDto(row: InvoiceLineRow): InvoiceLineDto {
  return {
    description: row.description,
    id: row.id,
    lineTotalExclTax: row.lineTotalExclTaxCents / 100,
    lineTotalInclTax: row.lineTotalInclTaxCents / 100,
    lineVatAmount: row.lineTotalVatCents / 100,
    quantity: row.quantityCents / 100,
    unitPrice: row.unitPriceCents / 100,
    vatRate: row.vatRateCents / 100,
  }
}
