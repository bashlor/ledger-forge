import type { InvoiceDto, InvoiceLineInput } from './types'

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
