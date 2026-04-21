import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import type { AuditEventInput } from './types.js'

import { insertAuditEvent } from './audit_writer.js'

export type AuditDbExecutor = DrizzleDb | DrizzleTx
export interface CriticalAuditTrail {
  record(tx: AuditDbExecutor, input: AuditEventInput): Promise<void>
}

type DrizzleDb = PostgresJsDatabase<any>

type DrizzleTx = Parameters<Parameters<DrizzleDb['transaction']>[0]>[0]

export class DatabaseCriticalAuditTrail implements CriticalAuditTrail {
  async record(tx: AuditDbExecutor, input: AuditEventInput): Promise<void> {
    await insertAuditEvent(tx, input)
  }
}
