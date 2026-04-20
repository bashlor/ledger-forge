import type { HttpContext } from '@adonisjs/core/http'

import { DashboardService } from '#core/accounting/application/dashboard/index'
import { accountingAccessFromSession } from '#core/accounting/application/support/access_context'
import { renderInertiaPage } from '#core/common/http/types/inertia_render_props'
import { getRequestIdFromHttpContext } from '#core/common/logging/request_id'
import { inject } from '@adonisjs/core'

export default class DashboardController {
  @inject()
  async dashboard(ctx: HttpContext, dashboardService: DashboardService) {
    const access = accountingAccessFromSession(ctx.authSession, getRequestIdFromHttpContext(ctx))
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
