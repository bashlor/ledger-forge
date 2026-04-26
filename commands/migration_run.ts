import type { CommandOptions } from '@adonisjs/core/types/ace'

import { getDrizzleMigrationsPath } from '#core/common/ace/drizzle_migrations'
import { endDrizzlePostgresClient } from '#core/common/providers/drizzle_provider'
import { BaseCommand } from '@adonisjs/core/ace'
import { migrate } from 'drizzle-orm/postgres-js/migrator'

export default class MigrationRun extends BaseCommand {
  static commandName = 'migration:run'
  static description = 'Apply pending Drizzle migrations'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    try {
      const db = await this.app.container.make('drizzle')
      const migrationsFolder = getDrizzleMigrationsPath(this.app)

      await migrate(db, { migrationsFolder })

      this.logger.success('All migrations applied successfully')
    } finally {
      await endDrizzlePostgresClient()
    }
  }
}
