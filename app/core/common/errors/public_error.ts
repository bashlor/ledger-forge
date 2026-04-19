import { DomainError } from '#core/shared/domain_error'
import {
  AuthenticationError,
  EmailNotVerifiedError,
  InvalidCredentialsError,
  SessionExpiredError,
  UserAlreadyExistsError,
  UserNotFoundError,
} from '#core/user_management/domain/errors'

export interface BetterAuthErrorEntry {
  status: number
  userMessage: string
}

export interface ResolvedPublicError {
  code: string
  fieldBag?: Record<string, string>
  message: string
  status: number
}

type DomainErrorTag =
  | 'already_exists'
  | 'business_logic_error'
  | 'forbidden'
  | 'invalid_data'
  | 'not_found'
  | 'unauthorized_user_operation'
  | 'unknown'
  | 'unspecified_internal_error'

interface PublicErrorOptions {
  errorKey?: string
  exposeInternalMessage?: boolean
  statusOverride?: number
}

interface StaticPublicErrorMapping {
  code: string
  fieldBag?: Record<string, string>
  message: string
}

const GENERIC_AUTH_ERROR_MESSAGE = 'An unexpected authentication error occurred. Please try again.'
const GENERIC_BUSINESS_ERROR_MESSAGE = 'The requested action could not be completed.'
const GENERIC_ERROR_MESSAGE = 'An unexpected error occurred.'
const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password.'
const SESSION_EXPIRED_MESSAGE = 'Session has expired or is invalid'
const USER_ALREADY_EXISTS_MESSAGE = 'A user with this email already exists'
const EMAIL_NOT_VERIFIED_MESSAGE = 'Email address has not been verified'
const USER_NOT_FOUND_MESSAGE = 'User not found'
const INVALID_TOKEN_MESSAGE = 'The link has expired or is invalid.'

const DOMAIN_TAG_TO_HTTP: Record<DomainErrorTag, number> = {
  already_exists: 409,
  business_logic_error: 422,
  forbidden: 403,
  invalid_data: 422,
  not_found: 404,
  unauthorized_user_operation: 401,
  unknown: 500,
  unspecified_internal_error: 500,
}

const BETTER_AUTH_ERROR_MAP: Record<string, BetterAuthErrorEntry> = {
  _default: {
    status: 500,
    userMessage: 'An unexpected error occurred. Please try again.',
  },
  CREDENTIAL_ACCOUNT_NOT_FOUND: {
    status: 401,
    userMessage: 'Invalid email or password.',
  },
  EMAIL_NOT_VERIFIED: {
    status: 403,
    userMessage: 'Please verify your email address before signing in.',
  },
  FAILED_TO_CREATE_USER: {
    status: 500,
    userMessage: 'Unable to create account. Please try again.',
  },
  INVALID_EMAIL: {
    status: 422,
    userMessage: 'The email address is invalid.',
  },
  INVALID_EMAIL_OR_PASSWORD: {
    status: 401,
    userMessage: 'Invalid email or password.',
  },
  INVALID_PASSWORD: {
    status: 422,
    userMessage: 'The password does not meet the requirements.',
  },
  INVALID_TOKEN: {
    status: 401,
    userMessage: 'The link has expired or is invalid.',
  },
  PASSWORD_TOO_LONG: {
    status: 422,
    userMessage: 'The password exceeds the maximum allowed length.',
  },
  PASSWORD_TOO_SHORT: {
    status: 422,
    userMessage: 'The password is too short.',
  },
  SESSION_EXPIRED: {
    status: 401,
    userMessage: 'Your session has expired. Please sign in again.',
  },
  USER_ALREADY_EXISTS: {
    status: 409,
    userMessage: 'An account with this email already exists.',
  },
  USER_NOT_FOUND: {
    status: 404,
    userMessage: 'No account found with this email.',
  },
}

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

export function domainErrorToHttpStatus(tag: string): number {
  return DOMAIN_TAG_TO_HTTP[tag as DomainErrorTag] ?? 500
}

export function lookupBetterAuthError(code: string | undefined): BetterAuthErrorEntry {
  return BETTER_AUTH_ERROR_MAP[code ?? ''] ?? BETTER_AUTH_ERROR_MAP['_default']
}

export function resolveBetterAuthPublicError(code: string | undefined): ResolvedPublicError {
  const entry = lookupBetterAuthError(code)

  switch (code) {
    case 'CREDENTIAL_ACCOUNT_NOT_FOUND':
    case 'INVALID_EMAIL_OR_PASSWORD':
      return { code: 'auth.invalid_credentials', message: entry.userMessage, status: entry.status }
    case 'EMAIL_NOT_VERIFIED':
      return { code: 'auth.email_not_verified', message: entry.userMessage, status: entry.status }
    case 'FAILED_TO_CREATE_USER':
      return { code: 'auth.signup_failed', message: entry.userMessage, status: entry.status }
    case 'INVALID_EMAIL':
    case 'INVALID_PASSWORD':
    case 'PASSWORD_TOO_LONG':
    case 'PASSWORD_TOO_SHORT':
      return { code: 'auth.invalid_payload', message: entry.userMessage, status: entry.status }
    case 'INVALID_TOKEN':
      return { code: 'auth.invalid_token', message: entry.userMessage, status: entry.status }
    case 'SESSION_EXPIRED':
      return { code: 'auth.session_expired', message: entry.userMessage, status: entry.status }
    case 'USER_ALREADY_EXISTS':
      return { code: 'auth.user_already_exists', message: entry.userMessage, status: entry.status }
    case 'USER_NOT_FOUND':
      return { code: 'auth.user_not_found', message: entry.userMessage, status: entry.status }
    default:
      return { code: 'auth.provider_failure', message: entry.userMessage, status: entry.status }
  }
}

export function resolvePublicError(
  error: unknown,
  options?: PublicErrorOptions
): ResolvedPublicError {
  if (error instanceof InvalidCredentialsError) {
    return {
      code: 'auth.invalid_credentials',
      fieldBag: { password: INVALID_CREDENTIALS_MESSAGE },
      message: INVALID_CREDENTIALS_MESSAGE,
      status: 401,
    }
  }

  if (error instanceof UserAlreadyExistsError) {
    return {
      code: 'auth.user_already_exists',
      fieldBag: { email: USER_ALREADY_EXISTS_MESSAGE },
      message: USER_ALREADY_EXISTS_MESSAGE,
      status: 409,
    }
  }

  if (error instanceof EmailNotVerifiedError) {
    return {
      code: 'auth.email_not_verified',
      fieldBag: { email: EMAIL_NOT_VERIFIED_MESSAGE },
      message: EMAIL_NOT_VERIFIED_MESSAGE,
      status: 403,
    }
  }

  if (error instanceof UserNotFoundError) {
    return {
      code: 'auth.user_not_found',
      fieldBag: { email: USER_NOT_FOUND_MESSAGE },
      message: USER_NOT_FOUND_MESSAGE,
      status: 404,
    }
  }

  if (error instanceof SessionExpiredError) {
    return {
      code: 'auth.session_expired',
      fieldBag:
        options?.errorKey === 'E_CHANGE_PASSWORD'
          ? { currentPassword: SESSION_EXPIRED_MESSAGE }
          : { password: SESSION_EXPIRED_MESSAGE },
      message: SESSION_EXPIRED_MESSAGE,
      status: 401,
    }
  }

  if (error instanceof AuthenticationError) {
    return {
      code: 'auth.provider_failure',
      fieldBag: authFieldBagForKey(options?.errorKey, GENERIC_AUTH_ERROR_MESSAGE),
      message: GENERIC_AUTH_ERROR_MESSAGE,
      status: options?.statusOverride ?? 500,
    }
  }

  if (error instanceof DomainError) {
    if (error.name === 'InvalidAuthPayloadError') {
      const message = resolveAuthPayloadPublicMessage(error.message)
      return {
        code: 'auth.invalid_payload',
        fieldBag: authPayloadFieldBag(message),
        message,
        status: 422,
      }
    }

    if (
      error.name === 'InvalidTokenError' ||
      (error.type === 'unauthorized_user_operation' && error.message === INVALID_TOKEN_MESSAGE)
    ) {
      return {
        code: 'auth.invalid_token',
        fieldBag:
          options?.errorKey === 'E_RESET_PASSWORD'
            ? { newPassword: INVALID_TOKEN_MESSAGE }
            : { password: INVALID_TOKEN_MESSAGE },
        message: INVALID_TOKEN_MESSAGE,
        status: 401,
      }
    }

    if (error.type === 'unauthorized_user_operation' && error.message === SESSION_EXPIRED_MESSAGE) {
      return {
        code: 'auth.session_expired',
        fieldBag: authFieldBagForKey(options?.errorKey, SESSION_EXPIRED_MESSAGE),
        message: SESSION_EXPIRED_MESSAGE,
        status: 401,
      }
    }

    const accountingMapping = ACCOUNTING_DOMAIN_ERROR_MAP[domainErrorLookupKey(error)]
    if (accountingMapping) {
      return {
        ...accountingMapping,
        status: domainErrorToHttpStatus(error.type),
      }
    }

    return {
      code: `domain.${error.type}`,
      message: genericDomainMessage(error.type),
      status: domainErrorToHttpStatus(error.type),
    }
  }

  const status = options?.statusOverride ?? 500
  const message =
    options?.exposeInternalMessage && error instanceof Error ? error.message : GENERIC_ERROR_MESSAGE

  return {
    code: 'app.unexpected_error',
    message,
    status,
  }
}

function authFieldBagForKey(
  errorKey: PublicErrorOptions['errorKey'],
  message: string
): Record<string, string> {
  switch (errorKey) {
    case 'E_CHANGE_PASSWORD':
      return { currentPassword: message }
    case 'E_RESET_PASSWORD':
      return { newPassword: message, token: message }
    case 'E_SIGNUP_ERROR':
      return { email: message, password: message }
    case 'E_UPDATE_PROFILE':
      return { name: message }
    default:
      return { password: message }
  }
}

function authPayloadFieldBag(message: string): Record<string, string> {
  return message.toLowerCase().includes('email') ? { email: message } : { password: message }
}

function domainErrorLookupKey(error: DomainError): string {
  return `${error.type}:${error.message}`
}

function genericDomainMessage(tag: string): string {
  switch (tag) {
    case 'already_exists':
      return 'The resource already exists.'
    case 'business_logic_error':
      return GENERIC_BUSINESS_ERROR_MESSAGE
    case 'forbidden':
      return 'You are not allowed to perform this action.'
    case 'invalid_data':
      return 'Some submitted data is invalid.'
    case 'not_found':
      return 'The requested resource was not found.'
    case 'unauthorized_user_operation':
      return 'You are not authorized to perform this action.'
    default:
      return GENERIC_ERROR_MESSAGE
  }
}

function resolveAuthPayloadPublicMessage(message: string): string {
  switch (message) {
    case 'The email address is invalid.':
    case 'The password does not meet the requirements.':
    case 'The password exceeds the maximum allowed length.':
    case 'The password is too short.':
      return message
    default:
      return 'The submitted credentials are invalid.'
  }
}
