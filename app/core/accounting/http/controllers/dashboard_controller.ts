import type { HttpContext } from '@adonisjs/core/http'

import { accountingAccessFromSession } from '#core/accounting/accounting_context'
import { DashboardService } from '#core/accounting/services/dashboard/index'
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
