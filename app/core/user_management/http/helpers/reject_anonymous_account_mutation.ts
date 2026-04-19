import type { HttpContext } from '@adonisjs/core/http'

import { presentPublicMessage } from '#core/common/http/presenters/inertia_public_error_presenter'

export function rejectAnonymousAccountMutation(
  ctx: HttpContext,
  message: string,
  options?: { redirectTo?: string }
) {
  ctx.logger.warn({ isAnonymous: true }, 'Anonymous account mutation rejected')

  return presentPublicMessage(ctx, message, {
    flashAll: true,
    redirectTo: options?.redirectTo,
  })
}
