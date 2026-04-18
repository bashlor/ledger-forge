import type { AccountingActivitySink } from './activity_log.js'
import type { AccountingBusinessCalendar } from './business_calendar.js'

export interface AccountingServiceDependencies {
  activitySink?: AccountingActivitySink
  businessCalendar?: AccountingBusinessCalendar
}
