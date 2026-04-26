import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { auditEvents } from '#core/accounting/drizzle/schema'
import * as schema from '#core/common/drizzle/index'
import { and, desc, eq } from 'drizzle-orm'

import type { AuditEntityType, AuditEventDto } from './types.js'

export interface TenantAuditEventDto {
  action: string
  actorEmail: null | string
  actorId: null | string
  actorName: null | string
  changes: unknown
  entityId: string
  entityType: string
  id: string
  metadata: unknown
  timestamp: Date
}

type DrizzleDb = PostgresJsDatabase<any>

export async function listAuditEventsForEntity(
  db: DrizzleDb,
  input: {
    entityId: string
    entityType: AuditEntityType
    tenantId: string
  }
): Promise<AuditEventDto[]> {
  return db
    .select()
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.organizationId, input.tenantId),
        eq(auditEvents.entityType, input.entityType),
        eq(auditEvents.entityId, input.entityId)
      )
    )
    .orderBy(desc(auditEvents.createdAt))
}

export async function listRecentAuditEventsForTenant(
  db: PostgresJsDatabase<typeof schema>,
  input: {
    limit?: number
    tenantId: string
  }
): Promise<TenantAuditEventDto[]> {
  const rows = await db
    .select({
      action: schema.auditEvents.action,
      actorEmail: schema.user.email,
      actorId: schema.auditEvents.actorId,
      actorName: schema.user.name,
      changes: schema.auditEvents.changes,
      entityId: schema.auditEvents.entityId,
      entityType: schema.auditEvents.entityType,
      id: schema.auditEvents.id,
      metadata: schema.auditEvents.metadata,
      timestamp: schema.auditEvents.createdAt,
    })
    .from(schema.auditEvents)
    .leftJoin(schema.user, eq(schema.auditEvents.actorId, schema.user.id))
    .where(eq(schema.auditEvents.organizationId, input.tenantId))
    .orderBy(desc(schema.auditEvents.createdAt))
    .limit(input.limit ?? 20)

  return rows
}
