import type { CreateInvoiceInput, InvoiceDto, InvoiceLineDto, InvoiceLineInput } from './types'

export function buildInvoiceFromInput(
  input: CreateInvoiceInput,
  meta: Pick<
    InvoiceDto,
    | 'customerAddressSnapshot'
    | 'customerCompanySnapshot'
    | 'customerEmailSnapshot'
    | 'customerId'
    | 'customerName'
    | 'customerPhoneSnapshot'
    | 'customerPrimaryContactSnapshot'
    | 'dueDate'
    | 'id'
    | 'invoiceNumber'
    | 'issueDate'
    | 'status'
  >,
  existingLineIds?: string[]
) {
  const lines = input.lines.map((line, index) =>
    calculateInvoiceLine(line, existingLineIds?.[index] ?? crypto.randomUUID())
  )
  const totals = calculateInvoiceTotals(lines)

  return {
    ...meta,
    lines,
    subtotalExclTax: totals.subtotalExclTax,
    totalInclTax: totals.totalInclTax,
    totalVat: totals.totalVat,
  } satisfies InvoiceDto
}

export function calculateInvoiceLine(input: InvoiceLineInput, id?: string): InvoiceLineDto {
  const quantity = Number.isFinite(input.quantity) ? input.quantity : 0
  const unitPrice = Number.isFinite(input.unitPrice) ? input.unitPrice : 0
  const vatRate = Number.isFinite(input.vatRate) ? input.vatRate : 0
  const lineTotalExclTax = roundCurrency(quantity * unitPrice)
  const lineVatAmount = roundCurrency(lineTotalExclTax * (vatRate / 100))
  const lineTotalInclTax = roundCurrency(lineTotalExclTax + lineVatAmount)

  return {
    description: input.description,
    id: id ?? crypto.randomUUID(),
    lineTotalExclTax,
    lineTotalInclTax,
    lineVatAmount,
    quantity,
    unitPrice,
    vatRate,
  }
}

export function calculateInvoiceTotals(lines: InvoiceLineInput[]) {
  return lines.reduce(
    (totals, line) => {
      const calculated = calculateInvoiceLine(line, 'preview-line')
      totals.subtotalExclTax = roundCurrency(totals.subtotalExclTax + calculated.lineTotalExclTax)
      totals.totalVat = roundCurrency(totals.totalVat + calculated.lineVatAmount)
      totals.totalInclTax = roundCurrency(totals.totalInclTax + calculated.lineTotalInclTax)
      return totals
    },
    { subtotalExclTax: 0, totalInclTax: 0, totalVat: 0 }
  )
}

export function canDeleteInvoice(invoice: Pick<InvoiceDto, 'status'>) {
  return invoice.status === 'draft'
}

export function canEditInvoice(invoice: Pick<InvoiceDto, 'status'>) {
  return invoice.status === 'draft'
}

export function canIssueInvoice(invoice: Pick<InvoiceDto, 'status'>) {
  return invoice.status === 'draft'
}

export function canMarkInvoicePaid(invoice: Pick<InvoiceDto, 'status'>) {
  return invoice.status === 'issued'
}

export function createEmptyInvoiceLine(): InvoiceLineInput {
  return {
    description: '',
    quantity: 1,
    unitPrice: 0,
    vatRate: 20,
  }
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100
}
