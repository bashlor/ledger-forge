import { DomainError } from '#core/common/errors/domain_error'
import { isValidIsoDate } from '#core/shared/date'

import type {
  NormalizedSaveInvoiceDraftInput,
  SaveInvoiceDraftInput,
  SaveInvoiceLineInput,
} from '../../types.js'

export function normalizeSaveInvoiceDraftInput(
  input: SaveInvoiceDraftInput
): NormalizedSaveInvoiceDraftInput {
  const customerId = input.customerId.trim()
  const dueDate = input.dueDate.trim()
  const issueDate = input.issueDate.trim()

  if (!customerId) {
    throw new DomainError('Customer is required.', 'invalid_data')
  }

  if (!issueDate || !isValidIsoDate(issueDate)) {
    throw new DomainError('Issue date is required.', 'invalid_data')
  }

  if (!dueDate || !isValidIsoDate(dueDate)) {
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
