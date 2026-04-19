import { DomainError } from '#core/common/errors/domain_error'

import type {
  InvoiceStatus,
  IssueInvoiceInput,
  NormalizedIssueInvoiceInput,
  NormalizedSaveInvoiceDraftInput,
  SaveInvoiceDraftInput,
  SaveInvoiceLineInput,
} from './types.js'

export function assertDueDateIsNotBefore(dueDate: string, minDate: string, message: string) {
  if (!dueDate || dueDate < minDate) {
    throw new DomainError(message, 'business_logic_error')
  }
}

export function assertInvoiceCanBeDeleted(status: InvoiceStatus) {
  if (status !== 'draft') {
    throw new DomainError('Only draft invoices can be deleted.', 'business_logic_error')
  }
}

export function assertInvoiceCanBeIssued(status: InvoiceStatus) {
  if (status !== 'draft') {
    throw new DomainError('Only draft invoices can be issued.', 'business_logic_error')
  }
}

export function assertInvoiceCanBeMarkedPaid(status: InvoiceStatus) {
  if (status !== 'issued') {
    throw new DomainError('Only issued invoices can be marked as paid.', 'business_logic_error')
  }
}

export function assertInvoiceCanBeUpdated(status: InvoiceStatus) {
  if (status !== 'draft') {
    throw new DomainError('Only draft invoices can be edited.', 'business_logic_error')
  }
}

export function assertInvoiceDates(issueDate: string, dueDate: string) {
  if (dueDate < issueDate) {
    throw new DomainError('Due date cannot be before the issue date.', 'business_logic_error')
  }
}

export function normalizeIssueInvoiceInput(input: IssueInvoiceInput): NormalizedIssueInvoiceInput {
  const issuedCompanyAddress = input.issuedCompanyAddress.trim()
  const issuedCompanyName = input.issuedCompanyName.trim()

  if (!issuedCompanyName || !issuedCompanyAddress) {
    throw new DomainError('Company name and company address are required to issue.', 'invalid_data')
  }

  return {
    issuedCompanyAddress,
    issuedCompanyName,
  }
}

export function normalizeSaveInvoiceDraftInput(
  input: SaveInvoiceDraftInput
): NormalizedSaveInvoiceDraftInput {
  const customerId = input.customerId.trim()
  const dueDate = input.dueDate.trim()
  const issueDate = input.issueDate.trim()

  if (!customerId) {
    throw new DomainError('Customer is required.', 'invalid_data')
  }

  if (!issueDate || !isISODate(issueDate)) {
    throw new DomainError('Issue date is required.', 'invalid_data')
  }

  if (!dueDate || !isISODate(dueDate)) {
    throw new DomainError('Due date is required.', 'invalid_data')
  }

  if (input.lines.length === 0) {
    throw new DomainError('Provide at least one invoice line.', 'invalid_data')
  }

  const lines = input.lines.map((line) => normalizeInvoiceLine(line))

  return {
    customerId,
    dueDate,
    issueDate,
    lines,
  }
}

function isISODate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function normalizeInvoiceLine(input: SaveInvoiceLineInput): SaveInvoiceLineInput {
  const description = input.description.trim()
  if (!description) {
    throw new DomainError('Invoice line description is required.', 'invalid_data')
  }

  if (!(input.quantity > 0)) {
    throw new DomainError('Invoice line quantity must be greater than 0.', 'invalid_data')
  }

  if (input.unitPrice < 0) {
    throw new DomainError('Invoice line unit price cannot be negative.', 'invalid_data')
  }

  if (input.vatRate < 0 || input.vatRate > 100) {
    throw new DomainError('Invoice line VAT rate must be between 0 and 100.', 'invalid_data')
  }

  return {
    description,
    quantity: input.quantity,
    unitPrice: input.unitPrice,
    vatRate: input.vatRate,
  }
}
