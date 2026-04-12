import { runDrizzleKit } from '#core/common/ace/drizzle_migrations'
import { BaseCommand, flags } from '@adonisjs/core/ace'

export default class MigrationPush extends BaseCommand {
  static commandName = 'migration:push'
  static description =
    'Push the Drizzle schema directly to the database without generating migration files (dev only)'

  @flags.boolean({
    description: 'Confirm all prompts automatically (non-interactive mode)',
  })
  declare force: boolean

  @flags.boolean({
    description: 'Run in strict mode — fail if any data loss statements are detected',
  })
  declare strict: boolean

  async run() {
    const drizzleFlags: string[] = []

    if (this.force) {
      drizzleFlags.push('--force')
    }

    if (this.strict) {
      drizzleFlags.push('--strict')
    }

    this.logger.warning(
      'migration:push applies schema changes directly to the database without creating migration files. Use only in development.'
    )

    await runDrizzleKit(this.app, 'push', drizzleFlags)

    this.logger.success('Schema pushed to the database.')
  }
}
