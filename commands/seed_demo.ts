import type { CommandOptions } from '@adonisjs/core/types/ace'

import { DemoDatasetService } from '#core/accounting/application/demo/demo_dataset_service'
import { systemAccessContext } from '#core/accounting/application/support/access_context'
import { DomainError } from '#core/common/errors/domain_error'
import { DemoCommandGuardService } from '#core/user_management/application/demo_command_guard_service'
import { BaseCommand, flags } from '@adonisjs/core/ace'

export default class SeedDemo extends BaseCommand {
  static commandName = 'demo:seed'
  static description = 'Seed demo data for a target tenant'

  static options: CommandOptions = { startApp: true }

  @flags.boolean({ description: 'Replace existing tenant business data before seeding' })
  declare force: boolean

  @flags.string({ description: 'Tenant / organization id to seed' })
  declare tenant?: string

  async run() {
    const tenantId = this.tenant?.trim()
    if (!tenantId) {
      throw new DomainError('The --tenant flag is required.', 'invalid_data')
    }

    new DemoCommandGuardService().ensureTenantAllowed()

    const db = await this.app.container.make('drizzle')
    const organization = await db.query.organization.findFirst({
      where: (table, { eq }) => eq(table.id, tenantId),
    })

    if (!organization) {
      throw new DomainError(`Organization ${tenantId} was not found.`, 'not_found')
    }

    const dataset = new DemoDatasetService(db)
    const access = systemAccessContext(tenantId, 'ace-demo-seed')

    if (this.force) {
      await dataset.resetTenant(access)
      this.logger.success(`Demo dataset re-seeded for tenant ${tenantId}.`)
      return
    }

    if (await dataset.hasAnyTenantData(tenantId)) {
      const message = `Organization ${tenantId} already contains data. Re-run with --force to replace it.`
      this.logger.error(message)
      throw new DomainError(message, 'business_logic_error')
    }

    await dataset.seedTenant(access)
    this.logger.success(`Demo dataset seeded for tenant ${tenantId}.`)
  }
}
