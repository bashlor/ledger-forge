import { lookupBetterAuthError } from '#core/common/resources/http_problem'
import { DomainError } from '#core/shared/domain_error'

import {
  AuthenticationError,
  EmailNotVerifiedError,
  InvalidCredentialsError,
  UserAlreadyExistsError,
  UserNotFoundError,
} from '../../domain/errors.js'

export function mapBetterAuthError(error: unknown): Error {
  if (error instanceof DomainError) {
    return error
  }

  const code = extractBetterAuthCode(error)
  const entry = lookupBetterAuthError(code)

  switch (code) {
    case 'CREDENTIAL_ACCOUNT_NOT_FOUND':
    case 'INVALID_EMAIL_OR_PASSWORD':
      return new InvalidCredentialsError()
    case 'EMAIL_NOT_VERIFIED':
      return new EmailNotVerifiedError()
    case 'INVALID_EMAIL':
    case 'INVALID_PASSWORD':
    case 'PASSWORD_TOO_LONG':
    case 'PASSWORD_TOO_SHORT':
      return new DomainError(entry.userMessage, 'invalid_data', 'InvalidAuthPayloadError')
    case 'INVALID_TOKEN':
    case 'SESSION_EXPIRED':
      return new DomainError(entry.userMessage, 'unauthorized_user_operation', 'InvalidTokenError')
    case 'USER_ALREADY_EXISTS':
      return new UserAlreadyExistsError()
    case 'USER_NOT_FOUND':
      return new UserNotFoundError()
    default:
      return AuthenticationError.linkingFailed(entry.userMessage)
  }
}

function extractBetterAuthCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') {
    return undefined
  }

  const candidate = error as Record<string, unknown>
  if (candidate.body && typeof candidate.body === 'object') {
    const nestedCode = (candidate.body as Record<string, unknown>).code
    if (typeof nestedCode === 'string') {
      return nestedCode
    }
  }

  return typeof candidate.code === 'string' ? candidate.code : undefined
}
