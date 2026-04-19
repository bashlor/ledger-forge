import type { Logger } from 'drizzle-orm/logger'

import { getDefaultStructuredLogFields, toRequestId } from '#core/common/logging/structured_log'
import appLogger from '@adonisjs/core/services/logger'

interface DrizzleStructuredLogger {
  trace(bindings: Record<string, unknown>, message: string): void
}

export class DrizzleLogger implements Logger {
  constructor(private readonly logger: DrizzleStructuredLogger = appLogger) {}

  logQuery(query: string, params: unknown[]): void {
    const defaults = getDefaultStructuredLogFields()

    this.logger.trace(
      {
        adapter: 'drizzle',
        boundedContext: 'common',
        context: defaults.context ?? 'Accounting',
        entityId: 'database',
        entityType: 'query',
        event: 'db.query',
        level: 'trace',
        operation: 'query',
        paramsCount: params.length,
        query,
        requestId: toRequestId(defaults.requestId),
        tenantId: defaults.tenantId ?? null,
        timestamp: new Date().toISOString(),
        userId: defaults.userId ?? null,
      },
      'Drizzle query'
    )
  }
}
