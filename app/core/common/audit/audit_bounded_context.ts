export type AuditBoundedContext = 'accounting' | 'user_management'

const ACCOUNTING_ENTITY_TYPES = new Set(['customer', 'expense', 'invoice'])

export function auditBoundedContextForEntity(entityType: string): AuditBoundedContext {
  return ACCOUNTING_ENTITY_TYPES.has(entityType) ? 'accounting' : 'user_management'
}
