import type { ApplicationService } from '@adonisjs/core/types'

import {
  StructuredAccountingActivitySink,
  SystemAccountingBusinessCalendar,
} from '#core/accounting/accounting_context'
import { CustomerService } from '#core/accounting/services/customer_service'
import { DashboardService } from '#core/accounting/services/dashboard_service'
import { ExpenseService } from '#core/accounting/services/expense_service'
import { InvoiceService } from '#core/accounting/services/invoice_service'
import logger from '@adonisjs/core/services/logger'

export default class AccountingProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.bind(CustomerService, async (resolver) => {
      const db = await resolver.make('drizzle')
      return new CustomerService(db, {
        activitySink: new StructuredAccountingActivitySink(logger, {
          adapter: 'service',
        }),
      })
    })

    this.app.container.bind(ExpenseService, async (resolver) => {
      const db = await resolver.make('drizzle')
      return new ExpenseService(db, {
        activitySink: new StructuredAccountingActivitySink(logger, {
          adapter: 'service',
        }),
      })
    })

    this.app.container.bind(InvoiceService, async (resolver) => {
      const db = await resolver.make('drizzle')
      return new InvoiceService(db, {
        activitySink: new StructuredAccountingActivitySink(logger, {
          adapter: 'service',
        }),
        businessCalendar: new SystemAccountingBusinessCalendar(),
      })
    })

    this.app.container.bind(DashboardService, async (resolver) => {
      const db = await resolver.make('drizzle')
      return new DashboardService(db)
    })
  }
}
