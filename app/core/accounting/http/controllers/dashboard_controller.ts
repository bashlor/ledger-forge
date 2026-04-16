import type { HttpContext } from '@adonisjs/core/http'

import { DashboardService } from '#core/accounting/services/dashboard_service'
import { renderInertiaPage } from '#core/common/http/types/inertia_render_props'
import { inject } from '@adonisjs/core'

export default class DashboardController {
  @inject()
  async dashboard({ inertia }: HttpContext, dashboardService: DashboardService) {
    return renderInertiaPage(inertia, 'app/dashboard', {
      dashboard: await dashboardService.getDashboard(),
    })
  }

  async home({ response }: HttpContext) {
    return response.redirect('/dashboard')
  }
}
