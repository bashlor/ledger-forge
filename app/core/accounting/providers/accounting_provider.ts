import type { ApplicationService } from '@adonisjs/core/types'

import { CustomerService } from '#core/accounting/services/customer_service'
import { DashboardService } from '#core/accounting/services/dashboard_service'
import { ExpenseService } from '#core/accounting/services/expense_service'
import { InvoiceService } from '#core/accounting/services/invoice_service'

export default class AccountingProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.bind(CustomerService, async (resolver) => {
      const db = await resolver.make('drizzle')
      return new CustomerService(db)
    })

    this.app.container.bind(ExpenseService, async (resolver) => {
      const db = await resolver.make('drizzle')
      return new ExpenseService(db)
    })

    this.app.container.bind(InvoiceService, async (resolver) => {
      const db = await resolver.make('drizzle')
      return new InvoiceService(db)
    })

    this.app.container.bind(DashboardService, async (resolver) => {
      const db = await resolver.make('drizzle')
      return new DashboardService(db)
    })
  }
}
