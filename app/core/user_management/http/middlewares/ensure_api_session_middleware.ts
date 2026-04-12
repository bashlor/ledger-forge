import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Requires ctx.authSession (populated by silent auth). Returns 401 JSON for APIs
 * instead of redirecting like {@link middleware.auth}.
 */
export default class EnsureApiSessionMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    if (!ctx.authSession) {
      return ctx.response.unauthorized({
        message: 'Your session has expired. Please sign in again.',
      })
    }

    return next()
  }
}
