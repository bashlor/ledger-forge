import { DomainError } from '#core/common/errors/domain_error'

import type { PublicErrorOptions, ResolvedPublicError } from './public_error_contract.js'

import { resolveAccountingPublicError } from './public_error_accounting.js'
import {
  lookupBetterAuthError,
  resolveAuthPublicError,
  resolveBetterAuthPublicError,
} from './public_error_auth.js'
import {
  domainErrorPresentation,
  domainErrorToHttpStatus,
  genericDomainMessage,
} from './public_error_domain.js'
import { publicError } from './public_error_helpers.js'

const GENERIC_ERROR_MESSAGE = 'An unexpected error occurred.'

export type {
  BetterAuthErrorEntry,
  PublicErrorKey,
  PublicErrorOptions,
  ResolvedPublicError,
} from './public_error_contract.js'

export { domainErrorToHttpStatus, lookupBetterAuthError, resolveBetterAuthPublicError }

/**
 * Build a lightweight public error for manual UI notifications that do not
 * originate from an exception.
 */
export function inlineNotificationPublicError(
  message: string,
  status: number = 422
): ResolvedPublicError {
  return publicError('app.inline_notification', message, status, undefined, 'notification')
}

/**
 * Convert any internal error into the single public contract used by both
 * web presenters and JSON Problem Details.
 *
 * Resolution order is intentional:
 * 1. auth-specific failures
 * 2. allowlisted accounting domain errors
 * 3. generic DomainError fallback by tag
 * 4. generic application error fallback
 */
export function resolvePublicError(
  error: unknown,
  options?: PublicErrorOptions
): ResolvedPublicError {
  const authError = resolveAuthPublicError(error, options)
  if (authError) {
    return authError
  }

  if (error instanceof DomainError) {
    const accountingError = resolveAccountingPublicError(error)
    if (accountingError) {
      return accountingError
    }

    return publicError(
      `domain.${error.type}`,
      genericDomainMessage(error.type),
      domainErrorToHttpStatus(error.type),
      undefined,
      domainErrorPresentation(error.type)
    )
  }

  const status = options?.statusOverride ?? 500
  const message =
    options?.exposeInternalMessage && error instanceof Error ? error.message : GENERIC_ERROR_MESSAGE

  return publicError('app.unexpected_error', message, status, undefined, 'notification')
}
