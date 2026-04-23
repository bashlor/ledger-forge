import type {
  AuditDbExecutor,
  CriticalAuditTrail,
} from '#core/accounting/application/audit/critical_audit_trail'
import type { AccountingActivitySink } from '#core/accounting/application/support/activity_log'

import type { CustomerStore } from './customer_store.js'

export interface CustomerUseCaseDeps {
  activitySink?: AccountingActivitySink
  auditExecutor: AuditDbExecutor
  auditTrail: CriticalAuditTrail
  store: CustomerStore
}
