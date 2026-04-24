import type { HttpContext } from '@adonisjs/core/http'

import { DomainError } from '#core/common/errors/domain_error'
import { resolvePublicError } from '#core/common/errors/public_error'
import { flashResolvedPublicError } from '#core/common/http/presenters/inertia_public_error_presenter'

/**
 * Canonical mutation policy for Inertia form submissions.
 *
 * Surface conventions:
 * - Success => flash success notification.
 * - Recoverable DomainError (except `not_found`) => flash resolved public error.
 * - `not_found` and unexpected errors => rethrow to global exception handler.
 */
export async function flashAction(
  ctx: HttpContext,
  action: () => Promise<unknown>,
  successMessage: string
): Promise<void> {
  try {
    await action()
    ctx.session.flash('notification', { message: successMessage, type: 'success' })
  } catch (error) {
    if (!(error instanceof DomainError) || error.type === 'not_found') throw error

    flashResolvedPublicError(ctx, resolvePublicError(error))
  }
}
