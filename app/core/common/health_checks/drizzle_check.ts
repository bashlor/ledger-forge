import type { HealthCheckResult } from '@adonisjs/core/types/health'

import { BaseCheck, Result } from '@adonisjs/core/health'
import ace from '@adonisjs/core/services/ace'

export class DrizzleCheck extends BaseCheck {
  name = 'Database health check (postgres/drizzle)'

  async run(): Promise<HealthCheckResult> {
    try {
      await ace.boot()

      ace.ui.switchMode('raw')
      try {
        const command = await ace.exec('migration:status', [])

        if (command.exitCode === 0) {
          return Result.ok('Successfully connected to the database and all migrations are applied')
        }

        return Result.failed('Migrations are not up to date')
      } finally {
        ace.ui.switchMode('normal')
      }
    } catch (error) {
      return Result.failed('Database is unreachable or migration check failed', error as Error)
    }
  }
}
