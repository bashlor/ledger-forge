import type { HttpContext } from '@adonisjs/core/http'

import { DashboardService } from '#core/accounting/application/dashboard/index'
import { accountingAccessFromSession } from '#core/accounting/application/support/access_context'
import { renderInertiaPage } from '#core/common/http/types/inertia_render_props'
import { inject } from '@adonisjs/core'

export default class DashboardController {
  @inject()
  async dashboard(ctx: HttpContext, dashboardService: DashboardService) {
    return renderInertiaPage(ctx.inertia, 'app/dashboard', {
      dashboard: await dashboardService.getDashboard(accountingAccessFromSession(ctx.authSession)),
    })
  }

  async home({ response }: HttpContext) {
    return response.redirect('/dashboard')
  }
}
