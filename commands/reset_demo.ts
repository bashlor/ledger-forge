import type { CommandOptions } from '@adonisjs/core/types/ace'

import { DemoDatasetService } from '#core/accounting/application/demo/demo_dataset_service'
import { systemAccessContext } from '#core/accounting/application/support/access_context'
import { DomainError } from '#core/common/errors/domain_error'
import { DemoCommandGuardService } from '#core/user_management/application/demo_command_guard_service'
import { BaseCommand, flags } from '@adonisjs/core/ace'

export default class ResetDemo extends BaseCommand {
  static commandName = 'demo:reset'
  static description = 'Reset and re-seed demo data for a target tenant'

  static options: CommandOptions = { startApp: true }

  @flags.string({ description: 'Tenant / organization id to reset' })
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

    await new DemoDatasetService(db).resetTenant(systemAccessContext(tenantId, 'ace-demo-reset'))
    this.logger.success(`Demo dataset reset for tenant ${tenantId}.`)
  }
}
