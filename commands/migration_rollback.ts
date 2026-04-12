import type { CommandOptions } from '@adonisjs/core/types/ace'

import { BaseCommand } from '@adonisjs/core/ace'
import { sql } from 'drizzle-orm'

export default class MigrationRollback extends BaseCommand {
  static commandName = 'migration:rollback'
  static description =
    'Remove the last applied Drizzle migration record from the database (does not revert SQL changes)'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const db = await this.app.container.make('drizzle')

    const result = await db.execute(sql`
      select id, hash, created_at
      from drizzle.__drizzle_migrations
      order by created_at desc, id desc
      limit 1
    `)

    const rows = Array.from(result as Iterable<Record<string, unknown>>)

    if (rows.length === 0) {
      this.logger.info('No applied migrations found. Nothing to roll back.')
      return
    }

    const lastMigration = rows[0]
    const migrationId = Number(lastMigration.id)

    await db.execute(sql`
      delete from drizzle.__drizzle_migrations
      where id = ${migrationId}
    `)

    this.logger.success(`Removed migration record with id ${migrationId} from the journal.`)

    this.logger.warning('Only the migration record was deleted. The SQL changes were NOT reverted.')
    this.logger.info('Next steps:')
    this.logger.info('  Write a corrective migration: node ace make:migration <name>')
    this.logger.info('  Apply it: node ace migration:run')
    this.logger.info(
      '  Or manually revert the SQL changes in the database before re-running migration:run'
    )
  }
}
