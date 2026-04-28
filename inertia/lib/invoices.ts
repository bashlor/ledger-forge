import type { InvoiceDto, InvoiceLineInput } from './types'

import { todayDateOnlyUtc } from './date'

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

/** Resolved row/status label: issued invoices past due surface as overdue for badges and scans. */
export function invoiceDisplayStatus(invoice: Pick<InvoiceDto, 'dueDate' | 'status'>): string {
  if (invoice.status === 'issued' && invoice.dueDate < todayDateOnlyUtc()) {
    return 'overdue'
  }
  return invoice.status
}
