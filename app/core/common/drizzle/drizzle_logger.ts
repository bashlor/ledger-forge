import type { Logger } from 'drizzle-orm/logger'

import appLogger from '@adonisjs/core/services/logger'

interface DrizzleStructuredLogger {
  trace(bindings: Record<string, unknown>, message: string): void
}

export class DrizzleLogger implements Logger {
  constructor(private readonly logger: DrizzleStructuredLogger = appLogger) {}

  logQuery(query: string, params: unknown[]): void {
    this.logger.trace(
      {
        adapter: 'drizzle',
        boundedContext: 'common',
        operation: 'query',
        params,
        query,
      },
      'Drizzle query'
    )
  }
}
