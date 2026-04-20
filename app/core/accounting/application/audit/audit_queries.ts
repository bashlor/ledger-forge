import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { auditEvents } from '#core/accounting/drizzle/schema'
import { and, desc, eq } from 'drizzle-orm'

import type { AuditEntityType, AuditEventDto } from './types.js'

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
