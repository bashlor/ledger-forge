import type { HttpContext } from '@adonisjs/core/http'

import { DashboardService } from '#core/accounting/application/dashboard/index'
import { accountingAccessFromActiveTenant } from '#core/accounting/application/support/access_context'
import { renderInertiaPage } from '#core/common/http/types/inertia_render_props'
import { getRequestIdFromHttpContext } from '#core/common/logging/request_id'
import { resolveActiveTenantContext } from '#core/user_management/application/active_tenant_context'
import { AuthorizationService } from '#core/user_management/application/authorization_service'
import { inject } from '@adonisjs/core'

export default class DashboardController {
  @inject()
  async dashboard(
    ctx: HttpContext,
    authorizationService: AuthorizationService,
    dashboardService: DashboardService
  ) {
    const activeTenant = await resolveActiveTenantContext(ctx.authSession, authorizationService)
    authorizationService.authorize(activeTenant.actor, 'dashboard.view')

    const access = accountingAccessFromActiveTenant(activeTenant, getRequestIdFromHttpContext(ctx))
    return renderInertiaPage(ctx.inertia, 'app/dashboard', {
      dashboard: ctx.inertia.defer(
        () => dashboardService.getDashboard(access) as never,
        'dashboard'
      ),
    })
  }

  @inject()
  async home(ctx: HttpContext, authorizationService: AuthorizationService) {
    const actor = await authorizationService.actorFromSession(ctx.authSession)
    const href = resolveHomeHref(actor, authorizationService)

    return ctx.response.redirect(href)
  }
}

function resolveHomeHref(
  actor: Awaited<ReturnType<AuthorizationService['actorFromSession']>>,
  authorizationService: AuthorizationService
): string {
  if (authorizationService.allows(actor, 'devTools.access')) {
    return '/_dev'
  }

  if (authorizationService.allows(actor, 'dashboard.view')) {
    return '/dashboard'
  }

  if (authorizationService.allows(actor, 'accounting.read')) {
    return '/customers'
  }

  if (authorizationService.allows(actor, 'membership.list')) {
    return '/organization'
  }

  return '/account'
}
