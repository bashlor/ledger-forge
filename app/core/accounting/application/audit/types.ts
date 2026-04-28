export const ACCOUNTING_AUDIT_ENTITY_TYPES = ['customer', 'expense', 'invoice'] as const
export const USER_MANAGEMENT_AUDIT_ENTITY_TYPES = [
  'auth',
  'member',
  'session',
  'user',
  'workspace',
] as const
export const TENANT_SCOPED_AUDIT_ENTITY_TYPES = ACCOUNTING_AUDIT_ENTITY_TYPES

export type AccountingAuditEntityType = (typeof ACCOUNTING_AUDIT_ENTITY_TYPES)[number]
export type AuditEntityType = AccountingAuditEntityType | UserManagementAuditEntityType
export interface AuditEventDto {
  action: string
  actorEmail: null | string
  actorId: null | string
  actorName: null | string
  changes: unknown
  createdAt: Date
  entityId: string
  entityType: string
  id: string
  metadata: unknown
  organizationId: null | string
}
export type AuditEventInput = GlobalAuditEventInput | TenantScopedAuditEventInput

export type GlobalAuditEventInput = BaseAuditEventInput & {
  entityType: Exclude<AuditEntityType, TenantScopedAuditEntityType>
  tenantId: null | string
}

export type TenantScopedAuditEntityType = (typeof TENANT_SCOPED_AUDIT_ENTITY_TYPES)[number]

export type TenantScopedAuditEventInput = BaseAuditEventInput & {
  entityType: TenantScopedAuditEntityType
  tenantId: string
}

export type UserManagementAuditEntityType = (typeof USER_MANAGEMENT_AUDIT_ENTITY_TYPES)[number]

interface BaseAuditEventInput {
  action: string
  actorId: null | string
  changes?: null | { after: Record<string, unknown>; before: Record<string, unknown> }
  entityId: string
  metadata?: null | Record<string, unknown>
}

export function isTenantScopedAuditEntityType(
  entityType: AuditEntityType
): entityType is TenantScopedAuditEntityType {
  return TENANT_SCOPED_AUDIT_ENTITY_TYPES.includes(entityType as TenantScopedAuditEntityType)
}
