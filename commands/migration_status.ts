import type { CommandOptions } from '@adonisjs/core/types/ace'

import {
  type DrizzleDbMigrationRow,
  readLocalMigrations,
} from '#core/common/ace/drizzle_migrations'
import { BaseCommand } from '@adonisjs/core/ace'
import { sql } from 'drizzle-orm'

export default class MigrationStatus extends BaseCommand {
  static commandName = 'migration:status'
  static description = 'Display the status of local and applied Drizzle migrations'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const localMigrations = readLocalMigrations(this.app)

    if (localMigrations.length === 0) {
      this.logger.info('No local Drizzle migrations found.')
      return
    }

    const db = await this.app.container.make('drizzle')
    let dbRows: DrizzleDbMigrationRow[] = []

    try {
      const result = await db.execute(sql`
        select id, hash, created_at
        from drizzle.__drizzle_migrations
        order by created_at asc, id asc
      `)

      const rows = Array.from(result as Iterable<Record<string, unknown>>)

      dbRows = rows.map((row) => ({
        createdAt: Number(row.created_at),
        hash: String(row.hash),
        id: Number(row.id),
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)

      if (message.includes('__drizzle_migrations') || message.includes('relation "drizzle.')) {
        this.logger.warning(
          'Table drizzle.__drizzle_migrations does not exist. No migrations have been applied yet.'
        )
      } else {
        throw error
      }
    }

    const appliedByTimestamp = new Map(dbRows.map((row) => [row.createdAt, row]))

    const table = this.ui.table()
    table.head(['Migration', 'Status'])

    for (const migration of localMigrations) {
      const appliedMigration = appliedByTimestamp.get(migration.when)

      if (!appliedMigration) {
        table.row([migration.tag, this.colors.yellow('pending')])
        continue
      }

      if (appliedMigration.hash !== migration.hash) {
        table.row([migration.tag, this.colors.red('changed')])
        continue
      }

      table.row([migration.tag, this.colors.green('applied')])
    }

    table.render()

    const extraDbMigrations = dbRows.filter(
      (row) => !localMigrations.some((migration) => migration.when === row.createdAt)
    )

    if (extraDbMigrations.length > 0) {
      this.logger.warning(
        `${extraDbMigrations.length} applied migration(s) in the database are missing from the local Drizzle journal.`
      )
    }

    const pendingCount = localMigrations.filter(
      (migration) => !appliedByTimestamp.has(migration.when)
    ).length
    const changedCount = localMigrations.filter((migration) => {
      const appliedMigration = appliedByTimestamp.get(migration.when)
      return appliedMigration ? appliedMigration.hash !== migration.hash : false
    }).length

    this.logger.info(
      `Summary: ${localMigrations.length} local, ${dbRows.length} applied, ${pendingCount} pending, ${changedCount} changed.`
    )

    if (pendingCount > 0 || changedCount > 0) {
      this.exitCode = 1
    }

    this.result = { applied: dbRows.length, changed: changedCount, pending: pendingCount }
  }
}
