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
    authorizationService.authorize(activeTenant.actor, 'accounting.read')

    const access = accountingAccessFromActiveTenant(activeTenant, getRequestIdFromHttpContext(ctx))
    return renderInertiaPage(ctx.inertia, 'app/dashboard', {
      dashboard: ctx.inertia.defer(
        () => dashboardService.getDashboard(access) as never,
        'dashboard'
      ),
    })
  }

  async home({ response }: HttpContext) {
    return response.redirect('/dashboard')
  }
}
