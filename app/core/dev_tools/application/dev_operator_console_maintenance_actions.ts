import type { DevOperatorScenarioContext } from '#core/dev_tools/application/dev_operator_console_scenario_service'
import type { AuthenticationPort } from '#core/user_management/domain/authentication'

import { type DemoDatasetService } from '#core/accounting/application/demo/demo_dataset_service'
import { DomainError } from '#core/common/errors/domain_error'
import { type DeferredDatabaseResetLauncher } from '#core/dev_tools/application/deferred_database_reset_launcher'
import { type DevOperatorTenantFactoryService } from '#core/dev_tools/application/dev_operator_tenant_factory_service'
import { type AuthorizationService } from '#core/user_management/application/authorization_service'
import { type LocalDevDestructiveToolsService } from '#core/user_management/application/local_dev_destructive_tools_service'

export interface DevOperatorConsoleCreateTenantInput {
  ownerEmail: string
  ownerPassword: string
  seedMode: 'empty' | 'seeded'
  tenantName: string
}

export class DevOperatorConsoleMaintenanceActions {
  constructor(
    private readonly demoDatasetService: DemoDatasetService,
    private readonly databaseResetLauncher: DeferredDatabaseResetLauncher,
    private readonly localDevDestructiveTools: LocalDevDestructiveToolsService,
    private readonly tenantFactoryService: DevOperatorTenantFactoryService,
    private readonly singleTenantMode: boolean
  ) {}

  async clearTenantData(
    scenario: DevOperatorScenarioContext,
    authorizationService: AuthorizationService
  ): Promise<string> {
    this.localDevDestructiveTools.ensureEnabled()
    authorizationService.authorize(scenario.actor, 'invoice.markPaid')
    await this.demoDatasetService.clearTenantData(scenario.tenantId)
    return 'Selected tenant dataset cleared.'
  }

  async createTenant(
    input: DevOperatorConsoleCreateTenantInput,
    auth: AuthenticationPort
  ): Promise<string> {
    if (this.singleTenantMode) {
      throw new DomainError('Tenant creation is unavailable in single-tenant mode.', 'forbidden')
    }

    const created = await this.tenantFactoryService.createTenant(input, auth)
    return `${created.tenantName} created for ${normalizeEmail(input.ownerEmail)}.`
  }

  async generateDemoData(
    scenario: DevOperatorScenarioContext,
    authorizationService: AuthorizationService
  ): Promise<string> {
    authorizationService.authorize(scenario.actor, 'invoice.markPaid')
    await this.demoDatasetService.seedTenant(scenario.access)
    return 'Demo data generated for the selected tenant.'
  }

  async resetDatabase(): Promise<string> {
    this.localDevDestructiveTools.ensureEnabled()
    this.databaseResetLauncher.schedule(process.pid)
    return 'Local database reset scheduled. The app will restart in a few seconds.'
  }

  async resetTenant(
    scenario: DevOperatorScenarioContext,
    authorizationService: AuthorizationService
  ): Promise<string> {
    this.localDevDestructiveTools.ensureEnabled()
    authorizationService.authorize(scenario.actor, 'invoice.markPaid')
    await this.demoDatasetService.resetTenant(scenario.access)
    return 'Selected tenant dataset reset and re-seeded.'
  }
}

function normalizeEmail(value: string | undefined): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
}
