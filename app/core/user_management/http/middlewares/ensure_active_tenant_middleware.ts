import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Requires an active organization (tenant) on the session.
 * Must run after {@link AuthMiddleware} (which populates ctx.authSession).
 *
 * Redirects to '/' when no tenant is active — WorkspaceShareMiddleware will
 * have already cleared activeOrganizationId if the user is no longer a member.
 */
export default class EnsureActiveTenantMiddleware {
  redirectTo = '/'

  async handle(ctx: HttpContext, next: NextFn) {
    if (!ctx.authSession?.session.activeOrganizationId) {
      return ctx.response.redirect(this.redirectTo)
    }

    return next()
  }
}
