import type { HttpContext } from '@adonisjs/core/http'

import { accountingStore } from '#core/accounting/services/mock_accounting_store'
import { renderInertiaPage } from '#core/common/http/types/inertia_render_props'

export default class AccountingPagesController {
  async dashboard({ inertia }: HttpContext) {
    return renderInertiaPage(inertia, 'app/dashboard', {
      dashboard: accountingStore.getDashboard(),
    })
  }

  async home({ response }: HttpContext) {
    return response.redirect('/dashboard')
  }
}
