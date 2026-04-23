import type {
  AuditDbExecutor,
  CriticalAuditTrail,
} from '#core/accounting/application/audit/critical_audit_trail'
import type { AccountingActivitySink } from '#core/accounting/application/support/activity_log'

import type { ExpenseStore } from './expense_store.js'

export interface ExpenseUseCaseDeps {
  activitySink?: AccountingActivitySink
  auditExecutor: AuditDbExecutor
  auditTrail: CriticalAuditTrail
  store: ExpenseStore
}
