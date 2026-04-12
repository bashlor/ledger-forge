import type { ApplicationService } from '@adonisjs/core/types'

import { CustomerService } from '#core/accounting/services/customer_service'
import { ExpenseService } from '#core/accounting/services/expense_service'

export default class AccountingProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.singleton(CustomerService, async (resolver) => {
      const db = await resolver.make('drizzle')
      return new CustomerService(db)
    })

    this.app.container.singleton(ExpenseService, async (resolver) => {
      const db = await resolver.make('drizzle')
      return new ExpenseService(db)
    })
  }
}
