import type { HttpContext } from '@adonisjs/core/http'

import { DomainError } from '#core/shared/domain_error'
import {
  AuthenticationError,
  EmailNotVerifiedError,
  InvalidCredentialsError,
  SessionExpiredError,
  UserAlreadyExistsError,
  UserNotFoundError,
} from '#core/user_management/domain/errors'

/**
 * Maps auth / user-management failures to Inertia field keys.
 * @adonisjs/inertia reads these from `session.flashMessages.get('inputErrorsBag')`.
 */
export function authFailureToInputErrorsBag(
  error: Error,
  options?: { errorKey?: string }
): Record<string, string> {
  const key = options?.errorKey
  const msg = error.message

  if (error instanceof InvalidCredentialsError) {
    return { password: msg }
  }
  if (error instanceof UserAlreadyExistsError) {
    return { email: msg }
  }
  if (error instanceof EmailNotVerifiedError) {
    return { email: msg }
  }
  if (error instanceof UserNotFoundError) {
    return { email: msg }
  }
  if (error instanceof SessionExpiredError) {
    if (key === 'E_CHANGE_PASSWORD') {
      return { currentPassword: msg }
    }
    return { password: msg }
  }
  if (error instanceof AuthenticationError) {
    switch (key) {
      case 'E_CHANGE_PASSWORD':
        return { currentPassword: msg }
      case 'E_RESET_PASSWORD':
        return { newPassword: msg, token: msg }
      case 'E_SIGNUP_ERROR':
        return { email: msg, password: msg }
      case 'E_UPDATE_PROFILE':
        return { name: msg }
      default:
        return { password: msg }
    }
  }
  if (error instanceof DomainError) {
    if (error.name === 'InvalidAuthPayloadError') {
      const lower = msg.toLowerCase()
      if (lower.includes('email')) {
        return { email: msg }
      }
      return { password: msg }
    }
    if (error.name === 'InvalidTokenError') {
      if (key === 'E_RESET_PASSWORD') {
        return { newPassword: msg }
      }
      return { password: msg }
    }
  }

  return {}
}

export function flashInertiaInputErrors(ctx: HttpContext, bag: Record<string, string>): void {
  if (Object.keys(bag).length === 0) {
    return
  }

  ctx.session.flash('inputErrorsBag', bag)
}
