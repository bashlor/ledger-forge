import { DomainError } from '#core/common/errors/domain_error'

import type { InvoiceStatus } from './invoice_status.js'

export function assertInvoiceBelongsToTenant(
  invoiceTenantId: null | string | undefined,
  tenantId: null | string | undefined
) {
  if (tenantId && invoiceTenantId && invoiceTenantId !== tenantId) {
    throw new DomainError('Invoice not found.', 'not_found')
  }
}

export function assertInvoiceCanBeMarkedPaid(status: InvoiceStatus) {
  if (status !== 'issued') {
    throw new DomainError('Only issued invoices can be marked as paid.', 'business_logic_error')
  }
}

export function assertInvoiceCanBeSent(status: InvoiceStatus) {
  if (status !== 'draft') {
    throw new DomainError('Only draft invoices can be issued.', 'business_logic_error')
  }
}

export function assertInvoiceDateIsValidForBusinessRules(issueDate: string, dueDate: string) {
  if (dueDate < issueDate) {
    throw new DomainError('Due date cannot be before the issue date.', 'business_logic_error')
  }
}

export function assertInvoiceDueDateIsNotBefore(dueDate: string, minDate: string, message: string) {
  if (!dueDate || dueDate < minDate) {
    throw new DomainError(message, 'business_logic_error')
  }
}

export function assertInvoiceIsDraft(
  status: InvoiceStatus,
  message = 'Only draft invoices can be edited.'
) {
  if (status !== 'draft') {
    throw new DomainError(message, 'business_logic_error')
  }
}
