import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { auditEvents } from '#core/accounting/drizzle/schema'
import { v7 as uuidv7 } from 'uuid'

import type { AuditEventInput } from './types.js'

type DrizzleDb = PostgresJsDatabase<any>
type DrizzleTx = Parameters<Parameters<DrizzleDb['transaction']>[0]>[0]

export async function insertAuditEvent(
  tx: DrizzleDb | DrizzleTx,
  input: AuditEventInput
): Promise<void> {
  await tx.insert(auditEvents).values({
    action: input.action,
    actorId: input.actorId,
    changes: input.changes ?? null,
    entityId: input.entityId,
    entityType: input.entityType,
    id: uuidv7(),
    metadata: input.metadata ?? null,
    organizationId: input.tenantId,
  })
}
