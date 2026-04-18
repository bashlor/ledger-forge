import type { Logger } from 'drizzle-orm/logger'

import appLogger from '@adonisjs/core/services/logger'

export class DrizzleLogger implements Logger {
  logQuery(query: string, params: unknown[]): void {
    appLogger.trace(
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
