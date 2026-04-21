import type { CriticalAuditTrail } from '../audit/critical_audit_trail.js'
import type { AccountingActivitySink } from './activity_log.js'
import type { AccountingBusinessCalendar } from './business_calendar.js'

export interface AccountingServiceDependencies {
  activitySink?: AccountingActivitySink
  auditTrail?: CriticalAuditTrail
  businessCalendar?: AccountingBusinessCalendar
}
