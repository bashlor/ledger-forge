import { DomainError } from '#core/common/errors/domain_error'

import type { InvoiceStatus } from './invoice_status.js'

export function assertDraftCanBeCanceled(
  status: InvoiceStatus,
  message = 'Only draft invoices can be deleted.'
) {
  assertInvoiceIsDraft(status, message)
}

export function assertDraftCanBeCreatedToday(issueDate: string, dueDate: string, today: string) {
  assertInvoiceDateIsValidForBusinessRules(issueDate, dueDate)
  assertInvoiceDueDateIsNotBefore(
    dueDate,
    today,
    'Due date must be on or after the draft creation date.'
  )
}

export function assertDraftCanBeUpdated(input: {
  createdAt: string
  dueDate: string
  issueDate: string
  status: InvoiceStatus
}) {
  assertInvoiceIsDraft(input.status)
  assertInvoiceDateIsValidForBusinessRules(input.issueDate, input.dueDate)
  assertInvoiceDueDateIsNotBefore(
    input.dueDate,
    input.createdAt,
    'Due date must be on or after the draft creation date.'
  )
}

export function assertInvoiceBelongsToTenant(
  invoiceTenantId: null | string | undefined,
  tenantId: null | string | undefined
) {
  // We intentionally treat both null and undefined as "no tenant context" here.
  // A strict !== null check would change system-access semantics by rejecting undefined.
  // eslint-disable-next-line eqeqeq
  if (tenantId != null && invoiceTenantId !== tenantId) {
    throw new DomainError('Invoice not found.', 'not_found')
  }
}

export function assertInvoiceCanBeIssuedToday(
  status: InvoiceStatus,
  dueDate: string,
  today: string
) {
  assertInvoiceCanBeSent(status)
  assertInvoiceDueDateIsNotBefore(
    dueDate,
    today,
    'Due date must be today or later to issue an invoice.'
  )
}

export function assertInvoiceCanBeMarkedPaid(status: InvoiceStatus) {
  if (status !== 'issued') {
    throw new DomainError('Only issued invoices can be marked as paid.', 'business_logic_error')
  }
}

export function assertInvoiceCanBeMarkedPaidNow(status: InvoiceStatus) {
  assertInvoiceCanBeMarkedPaid(status)
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
