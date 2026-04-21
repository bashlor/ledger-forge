import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { auditEvents } from '#core/accounting/drizzle/schema'

export const ACCOUNTING_READ_ONLY_MESSAGE =
  'Accounting is temporarily read-only because audit trail storage is unavailable.'

export interface AuditTrailHealthStatus {
  healthy: boolean
  message: string
}

export class AuditTrailHealthService {
  constructor(private readonly db: PostgresJsDatabase<any>) {}

  async getStatus(): Promise<AuditTrailHealthStatus> {
    try {
      await this.db.select({ id: auditEvents.id }).from(auditEvents).limit(1)

      return {
        healthy: true,
        message: 'Audit trail storage is available.',
      }
    } catch {
      return {
        healthy: false,
        message: ACCOUNTING_READ_ONLY_MESSAGE,
      }
    }
  }

  async isHealthy(): Promise<boolean> {
    const status = await this.getStatus()
    return status.healthy
  }
}
