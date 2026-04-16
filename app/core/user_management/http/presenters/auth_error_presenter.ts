import type { HttpContext } from '@adonisjs/core/http'

import {
  authFailureToInputErrorsBag,
  flashInertiaInputErrors,
} from '#core/common/http/presenters/inertia_input_errors'

export function presentAuthError(ctx: HttpContext, error: Error, defaultErrorKey: string) {
  ctx.session.flashAll()
  ctx.session.flash('notification', { message: error.message, type: 'error' })
  flashInertiaInputErrors(ctx, authFailureToInputErrorsBag(error, { errorKey: defaultErrorKey }))
  return ctx.response.redirect().toPath(ctx.request.url())
}
