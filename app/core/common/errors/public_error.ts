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

const GENERIC_AUTH_ERROR_MESSAGE = 'An unexpected authentication error occurred. Please try again.'
const GENERIC_ERROR_MESSAGE = 'An unexpected error occurred.'

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
      fieldBag: { password: error.message },
      message: error.message,
      status: 401,
    }
  }

  if (error instanceof UserAlreadyExistsError) {
    return {
      code: 'auth.user_already_exists',
      fieldBag: { email: error.message },
      message: error.message,
      status: 409,
    }
  }

  if (error instanceof EmailNotVerifiedError) {
    return {
      code: 'auth.email_not_verified',
      fieldBag: { email: error.message },
      message: error.message,
      status: 403,
    }
  }

  if (error instanceof UserNotFoundError) {
    return {
      code: 'auth.user_not_found',
      fieldBag: { email: error.message },
      message: error.message,
      status: 404,
    }
  }

  if (error instanceof SessionExpiredError) {
    return {
      code: 'auth.session_expired',
      fieldBag:
        options?.errorKey === 'E_CHANGE_PASSWORD'
          ? { currentPassword: error.message }
          : { password: error.message },
      message: error.message,
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
      return {
        code: 'auth.invalid_payload',
        fieldBag: authPayloadFieldBag(error.message),
        message: error.message,
        status: 422,
      }
    }

    if (error.name === 'InvalidTokenError') {
      return {
        code: 'auth.invalid_token',
        fieldBag:
          options?.errorKey === 'E_RESET_PASSWORD'
            ? { newPassword: error.message }
            : { password: error.message },
        message: error.message,
        status: 401,
      }
    }

    return {
      code: `domain.${error.type}`,
      message: error.message,
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
