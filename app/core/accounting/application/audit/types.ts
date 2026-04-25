export type AuditEntityType = 'customer' | 'expense' | 'invoice' | 'member' | 'session' | 'user'

export interface AuditEventDto {
  action: string
  actorId: null | string
  changes: unknown
  createdAt: Date
  entityId: string
  entityType: string
  id: string
  metadata: unknown
  organizationId: null | string
}

export interface AuditEventInput {
  action: string
  actorId: null | string
  changes?: null | { after: Record<string, unknown>; before: Record<string, unknown> }
  entityId: string
  entityType: AuditEntityType
  metadata?: null | Record<string, unknown>
  tenantId: null | string
}
