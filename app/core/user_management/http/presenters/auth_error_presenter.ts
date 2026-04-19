import type { HttpContext } from '@adonisjs/core/http'

import {
  authFailureToInputErrorsBag,
  authFailureToNotificationMessage,
  flashInertiaInputErrors,
} from '#core/common/http/presenters/inertia_input_errors'

export function presentAuthError(
  ctx: HttpContext,
  error: Error,
  defaultErrorKey: string,
  redirectTo?: string
) {
  ctx.session.flashAll()
  const options = { errorKey: defaultErrorKey }
  ctx.session.flash('notification', {
    message: authFailureToNotificationMessage(error, options),
    type: 'error',
  })
  flashInertiaInputErrors(ctx, authFailureToInputErrorsBag(error, options))
  return ctx.response.redirect().toPath(redirectTo ?? ctx.request.url())
}
