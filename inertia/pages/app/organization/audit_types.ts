/** Shared audit row type for Organization page + detail drawer. */
export interface OrganizationAuditEvent {
  action: string
  actorEmail: null | string
  actorId: null | string
  actorName: null | string
  boundedContext?: 'accounting' | 'user_management'
  changes: unknown
  entityId: string
  entityType: string
  id: string
  metadata: unknown
  timestamp: Date | string
}
