import type { HttpContext } from '@adonisjs/core/http'

import { resolvePublicError } from '#core/common/errors/public_error'
import { flashInertiaInputErrors } from '#core/common/http/presenters/inertia_input_errors'
import { DomainError } from '#core/shared/domain_error'

/**
 * Runs a service action and flashes the outcome.
 *
 * - `not_found` bubbles to the global handler (renders 404).
 * - Other `DomainError`s are flashed so the visitor stays on the page.
 * - Unexpected errors re-throw (500 via global handler).
 */
export async function flashAction(
  ctx: HttpContext,
  action: () => Promise<unknown>,
  successMessage: string,
  fallbackMessage: string
): Promise<void> {
  try {
    await action()
    ctx.session.flash('notification', { message: successMessage, type: 'success' })
  } catch (error) {
    if (!(error instanceof DomainError) || error.type === 'not_found') throw error

    const resolved = resolvePublicError(error)
    flashInertiaInputErrors(ctx, resolved.fieldBag ?? {})

    ctx.session.flash('notification', {
      message: resolved.message || fallbackMessage,
      type: 'error',
    })
  }
}
