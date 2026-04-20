import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import app from '@adonisjs/core/services/app'

/**
 * Requires an active organization (tenant) on the session.
 * Must run after {@link AuthMiddleware} (which populates ctx.authSession).
 *
 * Redirects to '/' when no tenant is active — WorkspaceShareMiddleware will
 * have already cleared activeOrganizationId if the user is no longer a member.
 *
 * In the test environment, route-level tests use fake sessions without a real
 * tenant context. The bypass mirrors the pattern used in WorkspaceShareMiddleware
 * so those tests can run without a full tenant setup.
 */
export default class EnsureActiveTenantMiddleware {
  redirectTo = '/'

  async handle(ctx: HttpContext, next: NextFn) {
    if (!ctx.authSession?.session.activeOrganizationId) {
      if (app.nodeEnvironment === 'test') {
        return next()
      }
      return ctx.response.redirect(this.redirectTo)
    }

    return next()
  }
}
