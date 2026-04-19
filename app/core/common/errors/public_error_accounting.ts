import { type DomainError } from '#core/common/errors/domain_error'

import type { ResolvedPublicError, StaticPublicErrorMapping } from './public_error_contract.js'

import { domainErrorPresentation, domainErrorToHttpStatus } from './public_error_domain.js'

const ACCOUNTING_DOMAIN_ERROR_MAP: Record<string, StaticPublicErrorMapping> = {
  'business_logic_error:Due date cannot be before the issue date.': {
    code: 'accounting.invoice_due_date_before_issue_date',
    message: 'Due date cannot be before the issue date.',
  },
  'business_logic_error:Only draft expenses can be confirmed.': {
    code: 'accounting.expense_confirm_draft_only',
    message: 'Only draft expenses can be confirmed.',
  },
  'business_logic_error:Only draft expenses can be deleted.': {
    code: 'accounting.expense_delete_draft_only',
    message: 'Only draft expenses can be deleted.',
  },
  'business_logic_error:Only draft invoices can be deleted.': {
    code: 'accounting.invoice_delete_draft_only',
    message: 'Only draft invoices can be deleted.',
  },
  'business_logic_error:Only draft invoices can be edited.': {
    code: 'accounting.invoice_edit_draft_only',
    message: 'Only draft invoices can be edited.',
  },
  'business_logic_error:Only draft invoices can be issued.': {
    code: 'accounting.invoice_issue_draft_only',
    message: 'Only draft invoices can be issued.',
  },
  'business_logic_error:Only issued invoices can be marked as paid.': {
    code: 'accounting.invoice_mark_paid_issued_only',
    message: 'Only issued invoices can be marked as paid.',
  },
  'business_logic_error:This customer is referenced by one or more invoices.': {
    code: 'accounting.customer_has_invoices',
    message: 'This customer is referenced by one or more invoices.',
  },
  'invalid_data:Amount must be greater than 0.': {
    code: 'accounting.expense_invalid_amount',
    message: 'Amount must be greater than 0.',
  },
  'invalid_data:Company name and company address are required to issue.': {
    code: 'accounting.invoice_issue_company_identity_required',
    message: 'Company name and company address are required to issue.',
  },
  'invalid_data:Customer address is required.': {
    code: 'accounting.customer_missing_address',
    fieldBag: { address: 'Customer address is required.' },
    message: 'Customer address is required.',
  },
  'invalid_data:Customer company is required.': {
    code: 'accounting.customer_missing_company',
    fieldBag: { company: 'Customer company is required.' },
    message: 'Customer company is required.',
  },
  'invalid_data:Customer contact name is required.': {
    code: 'accounting.customer_missing_contact_name',
    fieldBag: { name: 'Customer contact name is required.' },
    message: 'Customer contact name is required.',
  },
  'invalid_data:Customer is required.': {
    code: 'accounting.invoice_customer_required',
    message: 'Customer is required.',
  },
  'invalid_data:Due date is required.': {
    code: 'accounting.invoice_due_date_required',
    message: 'Due date is required.',
  },
  'invalid_data:Invalid expense category.': {
    code: 'accounting.expense_invalid_category',
    message: 'Invalid expense category.',
  },
  'invalid_data:Invoice line description is required.': {
    code: 'accounting.invoice_line_description_required',
    message: 'Invoice line description is required.',
  },
  'invalid_data:Invoice line quantity must be greater than 0.': {
    code: 'accounting.invoice_line_quantity_invalid',
    message: 'Invoice line quantity must be greater than 0.',
  },
  'invalid_data:Invoice line unit price cannot be negative.': {
    code: 'accounting.invoice_line_unit_price_invalid',
    message: 'Invoice line unit price cannot be negative.',
  },
  'invalid_data:Invoice line VAT rate must be between 0 and 100.': {
    code: 'accounting.invoice_line_vat_rate_invalid',
    message: 'Invoice line VAT rate must be between 0 and 100.',
  },
  'invalid_data:Issue date is required.': {
    code: 'accounting.invoice_issue_date_required',
    message: 'Issue date is required.',
  },
  'invalid_data:Label must not be empty.': {
    code: 'accounting.expense_label_required',
    message: 'Label must not be empty.',
  },
  'invalid_data:Provide at least an email or a phone number.': {
    code: 'accounting.customer_contact_method_required',
    fieldBag: {
      email: 'Provide at least an email or a phone number.',
      phone: 'Provide at least an email or a phone number.',
    },
    message: 'Provide at least an email or a phone number.',
  },
  'invalid_data:Provide at least one invoice line.': {
    code: 'accounting.invoice_lines_required',
    message: 'Provide at least one invoice line.',
  },
  'not_found:Customer not found.': {
    code: 'accounting.customer_not_found',
    message: 'Customer not found.',
  },
  'not_found:Expense not found.': {
    code: 'accounting.expense_not_found',
    message: 'Expense not found.',
  },
  'not_found:Invoice not found.': {
    code: 'accounting.invoice_not_found',
    message: 'Invoice not found.',
  },
}

export function resolveAccountingPublicError(error: DomainError): null | ResolvedPublicError {
  const mapping = ACCOUNTING_DOMAIN_ERROR_MAP[`${error.type}:${error.message}`]

  if (!mapping) {
    return null
  }

  return {
    ...mapping,
    presentation: domainErrorPresentation(error.type),
    status: domainErrorToHttpStatus(error.type),
  }
}
