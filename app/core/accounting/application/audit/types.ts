export type AuditEntityType = 'customer' | 'expense' | 'invoice' | 'member'

export interface AuditEventDto {
  action: string
  actorId: null | string
  changes: unknown
  createdAt: Date
  entityId: string
  entityType: string
  id: string
  metadata: unknown
  organizationId: string
}

export interface AuditEventInput {
  action: string
  actorId: null | string
  changes?: null | { after: Record<string, unknown>; before: Record<string, unknown> }
  entityId: string
  entityType: AuditEntityType
  metadata?: null | Record<string, unknown>
  tenantId: string
}
