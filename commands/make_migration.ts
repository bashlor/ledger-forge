import { runDrizzleKit } from '#core/common/ace/drizzle_migrations'
import { args, BaseCommand, flags } from '@adonisjs/core/ace'

export default class MakeMigration extends BaseCommand {
  static commandName = 'make:migration'
  static description = 'Generate a Drizzle SQL migration from the project schemas'

  @flags.boolean({ description: 'Generate an empty SQL file for a manual migration' })
  declare custom: boolean

  @args.string({ description: 'Human-readable name for the Drizzle migration to generate' })
  declare name: string

  @flags.string({
    description: 'Drizzle prefix strategy (index, timestamp, supabase, unix, none)',
  })
  declare prefix?: string

  async run() {
    const drizzleFlags = ['--name', this.name]

    if (this.custom) {
      drizzleFlags.push('--custom')
    }

    if (this.prefix) {
      drizzleFlags.push('--prefix', this.prefix)
    }

    await runDrizzleKit(this.app, 'generate', drizzleFlags)

    this.logger.success('Drizzle migration generated.')
  }
}
