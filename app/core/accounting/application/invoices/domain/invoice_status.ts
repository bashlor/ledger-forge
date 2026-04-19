export const INVOICE_STATUSES = ['draft', 'issued', 'paid'] as const

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

export function canTransitionInvoiceStatus(from: InvoiceStatus, to: InvoiceStatus): boolean {
  if (from === 'draft') return to === 'issued'
  if (from === 'issued') return to === 'paid'
  return false
}
