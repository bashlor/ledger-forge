import type { HttpContext } from '@adonisjs/core/http'

import { resolvePublicError } from '#core/common/errors/public_error'

/**
 * Maps auth / user-management failures to Inertia field keys.
 * @adonisjs/inertia reads these from `session.flashMessages.get('inputErrorsBag')`.
 */
export function authFailureToInputErrorsBag(
  error: Error,
  options?: { errorKey?: string }
): Record<string, string> {
  return resolvePublicError(error, options).fieldBag ?? {}
}

export function authFailureToNotificationMessage(
  error: Error,
  options?: { errorKey?: string }
): string {
  return resolvePublicError(error, options).message
}

export function flashInertiaInputErrors(ctx: HttpContext, bag: Record<string, string>): void {
  if (Object.keys(bag).length === 0) {
    return
  }

  ctx.session.flash('inputErrorsBag', bag)
}
