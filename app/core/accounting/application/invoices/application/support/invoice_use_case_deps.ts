import type { CriticalAuditTrail } from '#core/accounting/application/audit/critical_audit_trail'
import type { AccountingActivitySink } from '#core/accounting/application/support/activity_log'
import type { AccountingBusinessCalendar } from '#core/accounting/application/support/business_calendar'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

export interface InvoiceUseCaseDeps {
  activitySink?: AccountingActivitySink
  auditTrail: CriticalAuditTrail
  businessCalendar: AccountingBusinessCalendar
  db: PostgresJsDatabase<any>
}
