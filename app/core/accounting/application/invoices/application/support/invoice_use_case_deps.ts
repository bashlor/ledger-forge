import type { AccountingActivitySink } from '#core/accounting/application/support/activity_log'
import type { AccountingBusinessCalendar } from '#core/accounting/application/support/business_calendar'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

export interface InvoiceUseCaseDeps {
  activitySink?: AccountingActivitySink
  businessCalendar: AccountingBusinessCalendar
  db: PostgresJsDatabase<any>
}
