import type { ApplicationService } from '@adonisjs/core/types'

import { AuditTrailHealthService } from '#core/accounting/application/audit/audit_trail_health_service'
import { CustomerService } from '#core/accounting/application/customers/index'
import { DashboardService } from '#core/accounting/application/dashboard/index'
import { ExpenseService } from '#core/accounting/application/expenses/index'
import { InvoiceService } from '#core/accounting/application/invoices/index'
import { StructuredAccountingActivitySink } from '#core/accounting/application/support/activity_log'
import { SystemAccountingBusinessCalendar } from '#core/accounting/application/support/business_calendar'
import logger from '@adonisjs/core/services/logger'

export default class AccountingProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.singleton(AuditTrailHealthService, async () => {
      const db = await this.app.container.make('drizzle')
      return new AuditTrailHealthService(db)
    })

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
      return new DashboardService(db, {
        activitySink: new StructuredAccountingActivitySink(logger, {
          adapter: 'service',
        }),
      })
    })
  }
}
