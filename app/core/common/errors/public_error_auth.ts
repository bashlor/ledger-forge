import { DomainError } from '#core/common/errors/domain_error'
import {
  AuthenticationError,
  EmailNotVerifiedError,
  InvalidCredentialsError,
  SessionExpiredError,
  UserAlreadyExistsError,
  UserNotFoundError,
} from '#core/user_management/domain/errors'

import type {
  BetterAuthErrorEntry,
  PublicErrorKey,
  PublicErrorOptions,
  ResolvedPublicError,
} from './public_error_contract.js'

import { formPublicError } from './public_error_helpers.js'

const GENERIC_AUTH_ERROR_MESSAGE = 'An unexpected authentication error occurred. Please try again.'
const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password.'
const SESSION_EXPIRED_MESSAGE = 'Session has expired or is invalid'
const USER_ALREADY_EXISTS_MESSAGE = 'A user with this email already exists'
const EMAIL_NOT_VERIFIED_MESSAGE = 'Email address has not been verified'
const USER_NOT_FOUND_MESSAGE = 'User not found'
const INVALID_TOKEN_MESSAGE = 'The link has expired or is invalid.'

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

export function lookupBetterAuthError(code: string | undefined): BetterAuthErrorEntry {
  return BETTER_AUTH_ERROR_MAP[code ?? ''] ?? BETTER_AUTH_ERROR_MAP['_default']
}

export function resolveAuthPublicError(
  error: unknown,
  options?: PublicErrorOptions
): null | ResolvedPublicError {
  if (error instanceof InvalidCredentialsError) {
    return formPublicError('auth.invalid_credentials', INVALID_CREDENTIALS_MESSAGE, 401, {
      password: INVALID_CREDENTIALS_MESSAGE,
    })
  }

  if (error instanceof UserAlreadyExistsError) {
    return formPublicError('auth.user_already_exists', USER_ALREADY_EXISTS_MESSAGE, 409, {
      email: USER_ALREADY_EXISTS_MESSAGE,
    })
  }

  if (error instanceof EmailNotVerifiedError) {
    return formPublicError('auth.email_not_verified', EMAIL_NOT_VERIFIED_MESSAGE, 403, {
      email: EMAIL_NOT_VERIFIED_MESSAGE,
    })
  }

  if (error instanceof UserNotFoundError) {
    return formPublicError('auth.user_not_found', USER_NOT_FOUND_MESSAGE, 404, {
      email: USER_NOT_FOUND_MESSAGE,
    })
  }

  if (error instanceof SessionExpiredError) {
    return formPublicError(
      'auth.session_expired',
      SESSION_EXPIRED_MESSAGE,
      401,
      options?.errorKey === 'E_CHANGE_PASSWORD'
        ? { currentPassword: SESSION_EXPIRED_MESSAGE }
        : { password: SESSION_EXPIRED_MESSAGE }
    )
  }

  if (error instanceof AuthenticationError) {
    return formPublicError(
      'auth.provider_failure',
      GENERIC_AUTH_ERROR_MESSAGE,
      options?.statusOverride ?? 500,
      authFieldBagForKey(options?.errorKey, GENERIC_AUTH_ERROR_MESSAGE)
    )
  }

  if (!(error instanceof DomainError)) {
    return null
  }

  if (error.name === 'InvalidAuthPayloadError') {
    const message = resolveAuthPayloadPublicMessage(error.message)
    return formPublicError('auth.invalid_payload', message, 422, authPayloadFieldBag(message))
  }

  if (error.type === 'unauthorized_user_operation' && error.message === SESSION_EXPIRED_MESSAGE) {
    return formPublicError(
      'auth.session_expired',
      SESSION_EXPIRED_MESSAGE,
      401,
      authFieldBagForKey(options?.errorKey, SESSION_EXPIRED_MESSAGE)
    )
  }

  if (
    (error.name === 'InvalidTokenError' && error.message === INVALID_TOKEN_MESSAGE) ||
    (error.type === 'unauthorized_user_operation' && error.message === INVALID_TOKEN_MESSAGE)
  ) {
    return formPublicError(
      'auth.invalid_token',
      INVALID_TOKEN_MESSAGE,
      401,
      options?.errorKey === 'E_RESET_PASSWORD'
        ? { newPassword: INVALID_TOKEN_MESSAGE }
        : { password: INVALID_TOKEN_MESSAGE }
    )
  }

  if (error.name === 'InvalidTokenError') {
    return formPublicError(
      'auth.session_expired',
      error.message,
      401,
      authFieldBagForKey(options?.errorKey, error.message)
    )
  }

  return null
}

export function resolveBetterAuthPublicError(code: string | undefined): ResolvedPublicError {
  const entry = lookupBetterAuthError(code)

  switch (code) {
    case 'CREDENTIAL_ACCOUNT_NOT_FOUND':
    case 'INVALID_EMAIL_OR_PASSWORD':
      return formPublicError('auth.invalid_credentials', entry.userMessage, entry.status)
    case 'EMAIL_NOT_VERIFIED':
      return formPublicError('auth.email_not_verified', entry.userMessage, entry.status)
    case 'FAILED_TO_CREATE_USER':
      return formPublicError('auth.signup_failed', entry.userMessage, entry.status)
    case 'INVALID_EMAIL':
    case 'INVALID_PASSWORD':
    case 'PASSWORD_TOO_LONG':
    case 'PASSWORD_TOO_SHORT':
      return formPublicError('auth.invalid_payload', entry.userMessage, entry.status)
    case 'INVALID_TOKEN':
      return formPublicError('auth.invalid_token', entry.userMessage, entry.status)
    case 'SESSION_EXPIRED':
      return formPublicError('auth.session_expired', entry.userMessage, entry.status)
    case 'USER_ALREADY_EXISTS':
      return formPublicError('auth.user_already_exists', entry.userMessage, entry.status)
    case 'USER_NOT_FOUND':
      return formPublicError('auth.user_not_found', entry.userMessage, entry.status)
    default:
      return formPublicError('auth.provider_failure', entry.userMessage, entry.status)
  }
}

function authFieldBagForKey(
  errorKey: PublicErrorKey | undefined,
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
