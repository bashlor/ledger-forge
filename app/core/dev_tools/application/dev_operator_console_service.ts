import type { AuthenticationPort } from '#core/user_management/domain/authentication'
import type { AuthResult } from '#core/user_management/domain/authentication'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { DatabaseCriticalAuditTrail } from '#core/accounting/application/audit/critical_audit_trail'
import { CustomerService } from '#core/accounting/application/customers/index'
import { DemoDatasetService } from '#core/accounting/application/demo/demo_dataset_service'
import { ExpenseService } from '#core/accounting/application/expenses/index'
import { InvoiceService } from '#core/accounting/application/invoices/index'
import { DomainError } from '#core/common/errors/domain_error'
import { DeferredDatabaseResetLauncher } from '#core/dev_tools/application/deferred_database_reset_launcher'
import { DevOperatorConsoleAccountingActions } from '#core/dev_tools/application/dev_operator_console_accounting_actions'
import { DevOperatorConsoleMaintenanceActions } from '#core/dev_tools/application/dev_operator_console_maintenance_actions'
import { DevOperatorConsoleMembershipActions } from '#core/dev_tools/application/dev_operator_console_membership_actions'
import { DevOperatorConsolePageService } from '#core/dev_tools/application/dev_operator_console_page_service'
import { DevOperatorConsoleQueryService } from '#core/dev_tools/application/dev_operator_console_query_service'
import { DevOperatorConsoleScenarioService } from '#core/dev_tools/application/dev_operator_console_scenario_service'
import {
  type ActionName,
  type DevInspectorFilters,
  type DevInspectorPageDto,
  type DevOperatorActionInput,
} from '#core/dev_tools/application/dev_operator_console_types'
import { DevOperatorTenantFactoryService } from '#core/dev_tools/application/dev_operator_tenant_factory_service'
import { ensureDevToolsEnabled } from '#core/dev_tools/application/dev_tools_access'
import { LocalDevDestructiveToolsService } from '#core/user_management/application/local_dev_destructive_tools_service'
import { MemberService } from '#core/user_management/application/member_service'
import { isSingleTenantMode } from '#core/user_management/support/tenant_mode'

export {
  type ActionName,
  type DevInspectorAuditEventDto,
  type DevInspectorCustomerDto,
  type DevInspectorExpenseDto,
  type DevInspectorFilters,
  type DevInspectorInvoiceDto,
  type DevInspectorMemberDto,
  type DevInspectorMembershipDto,
  type DevInspectorMetricsDto,
  type DevInspectorPageDto,
  type DevInspectorTab,
  type DevOperatorActionInput,
  isDevOperatorActionName,
} from '#core/dev_tools/application/dev_operator_console_types'

interface DevOperatorConsoleDependencies {
  accountingActions?: DevOperatorConsoleAccountingActions
  customerService?: CustomerService
  databaseResetLauncher?: DeferredDatabaseResetLauncher
  demoDatasetService?: DemoDatasetService
  expenseService?: ExpenseService
  invoiceService?: InvoiceService
  localDevDestructiveTools?: LocalDevDestructiveToolsService
  maintenanceActions?: DevOperatorConsoleMaintenanceActions
  memberService?: MemberService
  membershipActions?: DevOperatorConsoleMembershipActions
  pageService?: DevOperatorConsolePageService
  queryService?: DevOperatorConsoleQueryService
  scenarioService?: DevOperatorConsoleScenarioService
  singleTenantMode?: boolean
  tenantFactoryService?: DevOperatorTenantFactoryService
}

export class DevOperatorConsoleService {
  private readonly accountingActions: DevOperatorConsoleAccountingActions
  private readonly maintenanceActions: DevOperatorConsoleMaintenanceActions
  private readonly membershipActions: DevOperatorConsoleMembershipActions
  private readonly pageService: DevOperatorConsolePageService
  private readonly scenarioService: DevOperatorConsoleScenarioService

  constructor(db: PostgresJsDatabase<any>, dependencies: DevOperatorConsoleDependencies = {}) {
    const queryService = dependencies.queryService ?? new DevOperatorConsoleQueryService(db)
    const customerService = dependencies.customerService ?? new CustomerService(db)
    const demoDatasetService = dependencies.demoDatasetService ?? new DemoDatasetService(db)
    const expenseService = dependencies.expenseService ?? new ExpenseService(db)
    const invoiceService = dependencies.invoiceService ?? new InvoiceService(db)
    const localDevDestructiveTools =
      dependencies.localDevDestructiveTools ?? new LocalDevDestructiveToolsService()
    const memberService = dependencies.memberService ?? new MemberService(db)
    const singleTenantMode = dependencies.singleTenantMode ?? isSingleTenantMode()

    this.scenarioService =
      dependencies.scenarioService ?? new DevOperatorConsoleScenarioService(db, queryService)
    this.accountingActions =
      dependencies.accountingActions ??
      new DevOperatorConsoleAccountingActions(
        db,
        new DatabaseCriticalAuditTrail(),
        customerService,
        expenseService,
        invoiceService
      )
    this.membershipActions =
      dependencies.membershipActions ?? new DevOperatorConsoleMembershipActions(db, memberService)
    this.maintenanceActions =
      dependencies.maintenanceActions ??
      new DevOperatorConsoleMaintenanceActions(
        demoDatasetService,
        dependencies.databaseResetLauncher ?? new DeferredDatabaseResetLauncher(),
        localDevDestructiveTools,
        dependencies.tenantFactoryService ?? new DevOperatorTenantFactoryService(db),
        singleTenantMode
      )
    this.pageService =
      dependencies.pageService ??
      new DevOperatorConsolePageService(
        queryService,
        singleTenantMode,
        localDevDestructiveTools.isEnabled()
      )
  }

  async getPageData(
    authSession: AuthResult,
    authorizationService: import('#core/user_management/application/authorization_service').AuthorizationService,
    filters: DevInspectorFilters = {}
  ): Promise<DevInspectorPageDto> {
    await this.ensureDevToolsEnabled()
    return this.pageService.getPageData(authSession, authorizationService, filters)
  }

  async runAction(
    authSession: AuthResult,
    action: ActionName,
    authorizationService: import('#core/user_management/application/authorization_service').AuthorizationService,
    input: DevOperatorActionInput = {},
    auth?: AuthenticationPort
  ): Promise<string> {
    await this.ensureDevToolsEnabled()
    const scenario = await this.scenarioService.resolveScenario(
      authSession,
      input.tenantId,
      input.memberId
    )

    switch (action) {
      case 'attempt-forbidden-access':
        return this.accountingActions.attemptForbiddenAccess(
          scenario,
          authorizationService,
          input.invoiceId
        )
      case 'change-invoice-status':
        return this.accountingActions.changeInvoiceStatus(
          scenario,
          authorizationService,
          input.invoiceId
        )
      case 'change-member-role':
        return this.membershipActions.changeMemberRole(
          scenario,
          authorizationService,
          input.memberId
        )
      case 'clear-tenant-data':
        return this.maintenanceActions.clearTenantData(scenario, authorizationService)
      case 'confirm-expense':
        return this.accountingActions.confirmExpense(
          scenario,
          authorizationService,
          input.expenseId
        )
      case 'create-customer-batch':
        authorizationService.authorize(scenario.actor, 'accounting.writeDrafts')
        return this.accountingActions.createCustomerBatch(scenario.access, input.count)
      case 'create-expense-test':
        authorizationService.authorize(scenario.actor, 'accounting.writeDrafts')
        return this.accountingActions.createExpenseBatch(scenario.access, input.count)
      case 'create-invoice-test':
        authorizationService.authorize(scenario.actor, 'accounting.writeDrafts')
        return this.accountingActions.createInvoiceBatch(scenario.access, input.count)
      case 'create-tenant':
        if (!auth) {
          throw new DomainError(
            'Authentication provider unavailable for tenant creation.',
            'forbidden'
          )
        }
        return this.maintenanceActions.createTenant(
          {
            ownerEmail: String(input.ownerEmail ?? ''),
            ownerPassword: String(input.ownerPassword ?? ''),
            seedMode: input.seedMode === 'seeded' ? 'seeded' : 'empty',
            tenantName: String(input.tenantName ?? '').trim(),
          },
          auth
        )
      case 'delete-confirmed-expense':
        return this.accountingActions.deleteConfirmedExpense(
          scenario,
          authorizationService,
          input.expenseId
        )
      case 'delete-customer':
        return this.accountingActions.deleteCustomer(
          scenario,
          authorizationService,
          input.customerId
        )
      case 'delete-expense':
        return this.accountingActions.deleteExpense(scenario, authorizationService, input.expenseId)
      case 'delete-invoice':
        return this.accountingActions.deleteInvoice(scenario, authorizationService, input.invoiceId)
      case 'generate-demo-data':
        return this.maintenanceActions.generateDemoData(scenario, authorizationService)
      case 'reset-database':
        return this.maintenanceActions.resetDatabase()
      case 'reset-tenant':
        return this.maintenanceActions.resetTenant(scenario, authorizationService)
      case 'switch-tenant':
        throw new DomainError(
          'Use the active tenant switch endpoint for this action.',
          'invalid_data'
        )
      case 'toggle-member-active':
        return this.membershipActions.toggleMemberActive(
          scenario,
          authorizationService,
          input.memberId
        )
      case 'update-customer':
        return this.accountingActions.updateCustomer(
          scenario,
          authorizationService,
          input.customerId
        )
      case 'update-invoice-draft':
        return this.accountingActions.updateInvoiceDraft(
          scenario,
          authorizationService,
          input.invoiceId
        )
      default:
        throw new DomainError('Unknown dev console action.', 'invalid_data')
    }
  }

  async switchActiveTenant(
    authSession: AuthResult,
    sessionToken: string,
    tenantId: string
  ): Promise<void> {
    await this.ensureDevToolsEnabled()
    await this.scenarioService.switchActiveTenant(authSession, sessionToken, tenantId)
  }

  private async ensureDevToolsEnabled(): Promise<void> {
    await ensureDevToolsEnabled()
  }
}
