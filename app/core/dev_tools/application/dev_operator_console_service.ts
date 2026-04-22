import type { CriticalAuditTrail } from '#core/accounting/application/audit/critical_audit_trail'
import type { AccountingAccessContext } from '#core/accounting/application/support/access_context'
import type { AuthResult } from '#core/user_management/domain/authentication'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { DatabaseCriticalAuditTrail } from '#core/accounting/application/audit/critical_audit_trail'
import { CustomerService } from '#core/accounting/application/customers/index'
import { DemoDatasetService } from '#core/accounting/application/demo/demo_dataset_service'
import { ExpenseService } from '#core/accounting/application/expenses/index'
import { InvoiceService } from '#core/accounting/application/invoices/index'
import * as schema from '#core/common/drizzle/index'
import { DomainError } from '#core/common/errors/domain_error'
import { DevOperatorConsolePageService } from '#core/dev_tools/application/dev_operator_console_page_service'
import { DevOperatorConsoleQueryService } from '#core/dev_tools/application/dev_operator_console_query_service'
import {
  type ActionName,
  type DevInspectorFilters,
  type DevInspectorPageDto,
  type DevOperatorActionInput,
} from '#core/dev_tools/application/dev_operator_console_types'
import {
  addDays,
  dateOnlyUtc,
  shortToken,
} from '#core/dev_tools/application/dev_operator_console_utils'
import {
  AuthorizationDeniedError,
  type AuthorizationService,
} from '#core/user_management/application/authorization_service'
import { MemberService } from '#core/user_management/application/member_service'
import { setActiveOrganizationForSession } from '#core/user_management/application/workspace_provisioning'
import { and, desc, eq, sql } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'

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
  auditTrail?: CriticalAuditTrail
  customerService?: CustomerService
  demoDatasetService?: DemoDatasetService
  expenseService?: ExpenseService
  invoiceService?: InvoiceService
  memberService?: MemberService
  pageService?: DevOperatorConsolePageService
  queryService?: DevOperatorConsoleQueryService
}

interface ScenarioContext {
  access: AccountingAccessContext
  actor: Awaited<ReturnType<AuthorizationService['actorFromSession']>>
  actorUserId: string
  selectedMember: null | ScenarioMember
  tenantId: string
}

interface ScenarioMember {
  email: string
  id: string
  isActive: boolean
  name: string
  role: 'admin' | 'member' | 'owner'
  userId: string
}

export class DevOperatorConsoleService {
  private readonly auditTrail: CriticalAuditTrail
  private readonly customerService: CustomerService
  private readonly demoDatasetService: DemoDatasetService
  private readonly expenseService: ExpenseService
  private readonly invoiceService: InvoiceService
  private readonly memberService: MemberService
  private readonly pageService: DevOperatorConsolePageService
  private readonly queryService: DevOperatorConsoleQueryService

  constructor(
    private readonly db: PostgresJsDatabase<typeof schema>,
    dependencies: DevOperatorConsoleDependencies = {}
  ) {
    this.auditTrail = dependencies.auditTrail ?? new DatabaseCriticalAuditTrail()
    this.customerService = dependencies.customerService ?? new CustomerService(db)
    this.demoDatasetService = dependencies.demoDatasetService ?? new DemoDatasetService(db)
    this.expenseService = dependencies.expenseService ?? new ExpenseService(db)
    this.invoiceService = dependencies.invoiceService ?? new InvoiceService(db)
    this.memberService = dependencies.memberService ?? new MemberService(db)
    this.queryService = dependencies.queryService ?? new DevOperatorConsoleQueryService(db)
    this.pageService =
      dependencies.pageService ?? new DevOperatorConsolePageService(this.queryService)
  }

  async getPageData(
    authSession: AuthResult,
    authorizationService: AuthorizationService,
    filters: DevInspectorFilters = {}
  ): Promise<DevInspectorPageDto> {
    return this.pageService.getPageData(authSession, authorizationService, filters)
  }

  async runAction(
    authSession: AuthResult,
    action: ActionName,
    authorizationService: AuthorizationService,
    input: DevOperatorActionInput = {}
  ): Promise<string> {
    const scenario = await this.resolveScenario(authSession, input.tenantId, input.memberId)

    switch (action) {
      case 'attempt-forbidden-access':
        return this.attemptForbiddenAccess(scenario, authorizationService, input.invoiceId)
      case 'change-invoice-status':
        return this.changeInvoiceStatus(scenario, authorizationService, input.invoiceId)
      case 'change-member-role':
        return this.changeMemberRole(scenario, authorizationService, input.memberId)
      case 'clear-tenant-data':
        authorizationService.authorize(scenario.actor, 'invoice.markPaid')
        await this.demoDatasetService.clearTenantData(scenario.tenantId)
        return 'Selected tenant dataset cleared.'
      case 'confirm-expense':
        return this.confirmExpense(scenario, authorizationService, input.expenseId)
      case 'create-customer-batch':
        authorizationService.authorize(scenario.actor, 'accounting.writeDrafts')
        return this.createCustomerBatch(scenario.access, input.count)
      case 'create-expense-test':
        authorizationService.authorize(scenario.actor, 'accounting.writeDrafts')
        return this.createExpenseBatch(scenario.access, input.count)
      case 'create-invoice-test':
        authorizationService.authorize(scenario.actor, 'accounting.writeDrafts')
        return this.createInvoiceBatch(scenario.access, input.count)
      case 'create-tenant-scenario':
        return this.createTenantScenario(authSession.user.id, false)
      case 'create-tenant-scenario-seeded':
        return this.createTenantScenario(authSession.user.id, true)
      case 'delete-confirmed-expense':
        return this.deleteConfirmedExpense(scenario, authorizationService, input.expenseId)
      case 'delete-customer':
        return this.deleteCustomer(scenario, authorizationService, input.customerId)
      case 'delete-expense':
        return this.deleteExpense(scenario, authorizationService, input.expenseId)
      case 'delete-invoice':
        return this.deleteInvoice(scenario, authorizationService, input.invoiceId)
      case 'generate-demo-data':
        authorizationService.authorize(scenario.actor, 'invoice.markPaid')
        await this.demoDatasetService.seedTenant(scenario.access)
        return 'Demo data generated for the selected tenant.'
      case 'reset-local-dataset':
        authorizationService.authorize(scenario.actor, 'invoice.markPaid')
        await this.demoDatasetService.resetTenant(scenario.access)
        return 'Selected tenant dataset reset and re-seeded.'
      case 'switch-tenant':
        throw new DomainError(
          'Use the active tenant switch endpoint for this action.',
          'invalid_data'
        )
      case 'toggle-member-active':
        return this.toggleMemberActive(scenario, authorizationService, input.memberId)
      case 'update-customer':
        return this.updateCustomer(scenario, authorizationService, input.customerId)
      case 'update-invoice-draft':
        return this.updateInvoiceDraft(scenario, authorizationService, input.invoiceId)
      default:
        throw new DomainError('Unknown dev console action.', 'invalid_data')
    }
  }

  async switchActiveTenant(
    authSession: AuthResult,
    sessionToken: string,
    tenantId: string
  ): Promise<void> {
    const [membership] = await this.db
      .select({ organizationId: schema.member.organizationId })
      .from(schema.member)
      .where(
        and(
          eq(schema.member.userId, authSession.user.id),
          eq(schema.member.organizationId, tenantId)
        )
      )
      .limit(1)

    if (!membership) {
      throw new DomainError('You are not a member of this organization.', 'forbidden')
    }

    await setActiveOrganizationForSession(this.db, sessionToken, tenantId)
  }

  private async attemptForbiddenAccess(
    scenario: ScenarioContext,
    authorizationService: AuthorizationService,
    requestedInvoiceId?: string
  ): Promise<string> {
    const canMarkPaid = authorizationService.allows(scenario.actor, 'invoice.markPaid')
    if (canMarkPaid) {
      throw new DomainError(
        'Selected member can already mark invoices as paid. Choose a lower-privilege member first.',
        'business_logic_error'
      )
    }

    const targetInvoice = await this.queryService.findAnyInvoice(
      scenario.tenantId,
      requestedInvoiceId
    )
    if (!targetInvoice) {
      throw new DomainError(
        'Create a test invoice before running the forbidden-access scenario.',
        'business_logic_error'
      )
    }

    await this.auditTrail.record(this.db, {
      action: 'dev_denied_mark_paid',
      actorId: scenario.access.actorId,
      entityId: targetInvoice.id,
      entityType: 'invoice',
      metadata: {
        attemptedAbility: 'invoice.markPaid',
        result: 'denied',
      },
      tenantId: scenario.tenantId,
    })

    throw new AuthorizationDeniedError(
      'Denied as expected: selected member cannot mark invoices as paid.'
    )
  }

  private async changeInvoiceStatus(
    scenario: ScenarioContext,
    authorizationService: AuthorizationService,
    requestedInvoiceId?: string
  ): Promise<string> {
    const nextTarget = await this.queryService.findInvoiceForStatusTransition(
      scenario.tenantId,
      requestedInvoiceId
    )

    if (!nextTarget) {
      authorizationService.authorize(scenario.actor, 'accounting.writeDrafts')
      const draftMessage = await this.createInvoiceBatch(scenario.access, 1)
      return `${draftMessage} No existing invoice could be advanced, so a fresh draft was created.`
    }

    if (nextTarget.status === 'draft') {
      authorizationService.authorize(scenario.actor, 'invoice.issue')
      await this.invoiceService.issueInvoice(
        nextTarget.id,
        {
          issuedCompanyAddress: '15 rue de la Paix, 75001 Paris',
          issuedCompanyName: 'Precision Ledger Dev',
        },
        scenario.access
      )
      return `Invoice ${nextTarget.invoiceNumber} issued.`
    }

    authorizationService.authorize(scenario.actor, 'invoice.markPaid')
    await this.invoiceService.markInvoicePaid(nextTarget.id, scenario.access)
    return `Invoice ${nextTarget.invoiceNumber} marked as paid.`
  }

  private async changeMemberRole(
    scenario: ScenarioContext,
    authorizationService: AuthorizationService,
    requestedMemberId?: string
  ): Promise<string> {
    const target = await this.queryService.findTargetMember(
      scenario.tenantId,
      scenario.actorUserId,
      requestedMemberId
    )

    if (!target) {
      throw new DomainError(
        'No other member is available in the selected tenant.',
        'business_logic_error'
      )
    }

    const subject = await authorizationService.membershipSubject(scenario.tenantId, target.id)
    authorizationService.authorize(scenario.actor, 'membership.changeRole', subject ?? undefined)

    const nextRole = target.role === 'admin' ? 'member' : 'admin'
    await this.memberService.updateMemberRole(target.id, nextRole, scenario.tenantId)

    const membershipLabel = await this.queryService.loadUserLabel(target.userId)
    await this.auditTrail.record(this.db, {
      action: 'dev_change_member_role',
      actorId: scenario.access.actorId,
      changes: {
        after: { role: nextRole },
        before: { role: target.role },
      },
      entityId: target.id,
      entityType: 'member',
      metadata: {
        memberUserId: target.userId,
        memberUserLabel: membershipLabel,
        result: 'success',
      },
      tenantId: scenario.tenantId,
    })

    return `${membershipLabel} switched to ${nextRole}.`
  }

  private async confirmExpense(
    scenario: ScenarioContext,
    authorizationService: AuthorizationService,
    requestedExpenseId?: string
  ): Promise<string> {
    authorizationService.authorize(scenario.actor, 'accounting.writeDrafts')

    const targetExpense = await this.queryService.findDraftExpenseForConfirm(
      scenario.tenantId,
      requestedExpenseId
    )
    if (!targetExpense) {
      throw new DomainError(
        'No draft expense is available in the selected tenant.',
        'business_logic_error'
      )
    }

    await this.expenseService.confirmExpense(targetExpense.id, scenario.access)
    return `Expense ${targetExpense.label} confirmed.`
  }

  private async createCustomerBatch(
    access: AccountingAccessContext,
    batchSize = 4
  ): Promise<string> {
    for (let index = 0; index < batchSize; index++) {
      const suffix = shortToken()
      await this.customerService.createCustomer(
        {
          address: `${10 + index} rue des Tests, 75010 Paris`,
          company: `Dev Customer ${suffix}`,
          email: `dev-customer-${suffix}@example.local`,
          name: `Dev Contact ${index + 1}`,
          note: 'Created from the dev operator console',
          phone: `+33 6 10 20 30 ${String(40 + index).padStart(2, '0')}`,
        },
        access
      )
    }

    return `${batchSize} customers created.`
  }

  private async createExpenseBatch(
    access: AccountingAccessContext,
    batchSize = 3
  ): Promise<string> {
    for (let index = 0; index < batchSize; index++) {
      await this.expenseService.createExpense(
        {
          amount: 48 + index * 11,
          category: index % 2 === 0 ? 'Software' : 'Travel',
          date: dateOnlyUtc(new Date()),
          label: `Dev expense ${shortToken()}`,
        },
        access
      )
    }

    return `${batchSize} draft expenses created.`
  }

  private async createInvoiceBatch(
    access: AccountingAccessContext,
    batchSize = 3
  ): Promise<string> {
    const today = dateOnlyUtc(new Date())

    for (let index = 0; index < batchSize; index++) {
      const customerId = await this.findOrCreateCustomer(access)
      await this.invoiceService.createDraft(
        {
          customerId,
          dueDate: addDays(today, 14 + index),
          issueDate: today,
          lines: [
            {
              description: `Dev operator invoice ${shortToken()}`,
              quantity: index + 1,
              unitPrice: 120 + index * 15,
              vatRate: 20,
            },
          ],
        },
        access
      )
    }

    return `${batchSize} draft invoices created.`
  }

  private async createTenantScenario(operatorUserId: string, seedData: boolean): Promise<string> {
    const suffix = shortToken()
    const tenantId = uuidv7()
    const tenantName = `Dev Scenario ${suffix}`
    const tenantSlug = `dev-scenario-${suffix}-${shortToken()}`
    const actorIds = {
      activeMember: uuidv7(),
      admin: uuidv7(),
      inactiveMember: uuidv7(),
      owner: uuidv7(),
    }

    await this.db.transaction(async (tx) => {
      await tx.insert(schema.organization).values({
        createdAt: new Date(),
        id: tenantId,
        logo: null,
        metadata: JSON.stringify({ devInspectorScenario: true }),
        name: tenantName,
        slug: tenantSlug,
      })

      await tx.insert(schema.member).values({
        createdAt: new Date(),
        id: uuidv7(),
        isActive: true,
        organizationId: tenantId,
        role: 'member',
        userId: operatorUserId,
      })

      await this.insertScenarioUser(tx, {
        email: `dev-owner-${suffix}@example.local`,
        memberId: uuidv7(),
        name: `Dev Owner ${suffix}`,
        organizationId: tenantId,
        role: 'owner',
        userId: actorIds.owner,
      })
      await this.insertScenarioUser(tx, {
        email: `dev-admin-${suffix}@example.local`,
        memberId: uuidv7(),
        name: `Dev Admin ${suffix}`,
        organizationId: tenantId,
        role: 'admin',
        userId: actorIds.admin,
      })
      await this.insertScenarioUser(tx, {
        email: `dev-member-active-${suffix}@example.local`,
        memberId: uuidv7(),
        name: `Dev Member Active ${suffix}`,
        organizationId: tenantId,
        role: 'member',
        userId: actorIds.activeMember,
      })
      await this.insertScenarioUser(tx, {
        email: `dev-member-inactive-${suffix}@example.local`,
        isActive: false,
        memberId: uuidv7(),
        name: `Dev Member Inactive ${suffix}`,
        organizationId: tenantId,
        role: 'member',
        userId: actorIds.inactiveMember,
      })
    })

    if (seedData) {
      await this.demoDatasetService.seedTenant({
        actorId: actorIds.owner,
        isAnonymous: false,
        requestId: 'dev-operator-console',
        tenantId,
      })
    }

    return `${tenantName} created with owner/admin/member scenarios${seedData ? ' and demo data' : ''}.`
  }

  private async deleteConfirmedExpense(
    scenario: ScenarioContext,
    authorizationService: AuthorizationService,
    requestedExpenseId?: string
  ): Promise<string> {
    authorizationService.authorize(scenario.actor, 'accounting.writeDrafts')

    const targetExpense = await this.queryService.findConfirmedExpenseForDeletion(
      scenario.tenantId,
      requestedExpenseId
    )
    if (!targetExpense) {
      throw new DomainError(
        'No confirmed expense is available in the selected tenant.',
        'business_logic_error'
      )
    }

    await this.expenseService.deleteExpense(targetExpense.id, scenario.access)
    return `Expense ${targetExpense.label} deleted.`
  }

  private async deleteCustomer(
    scenario: ScenarioContext,
    authorizationService: AuthorizationService,
    requestedCustomerId?: string
  ): Promise<string> {
    authorizationService.authorize(scenario.actor, 'accounting.writeDrafts')

    const targetCustomer = await this.queryService.findCustomerForMutation(
      scenario.tenantId,
      requestedCustomerId
    )
    if (!targetCustomer) {
      throw new DomainError(
        'No customer is available in the selected tenant.',
        'business_logic_error'
      )
    }

    await this.customerService.deleteCustomer(targetCustomer.id, scenario.access)
    return `Customer ${targetCustomer.company} deleted.`
  }

  private async deleteExpense(
    scenario: ScenarioContext,
    authorizationService: AuthorizationService,
    requestedExpenseId?: string
  ): Promise<string> {
    authorizationService.authorize(scenario.actor, 'accounting.writeDrafts')

    const targetExpense = await this.queryService.findExpenseForDeletion(
      scenario.tenantId,
      requestedExpenseId
    )
    if (!targetExpense) {
      throw new DomainError(
        'No expense is available in the selected tenant.',
        'business_logic_error'
      )
    }

    await this.expenseService.deleteExpense(targetExpense.id, scenario.access)
    return `Expense ${targetExpense.label} deleted.`
  }

  private async deleteInvoice(
    scenario: ScenarioContext,
    authorizationService: AuthorizationService,
    requestedInvoiceId?: string
  ): Promise<string> {
    authorizationService.authorize(scenario.actor, 'accounting.writeDrafts')

    const targetInvoice = await this.queryService.findDraftInvoiceForMutation(
      scenario.tenantId,
      requestedInvoiceId
    )
    if (!targetInvoice) {
      throw new DomainError(
        'No draft invoice is available in the selected tenant.',
        'business_logic_error'
      )
    }

    await this.invoiceService.deleteDraft(targetInvoice.id, scenario.access)
    return `Draft invoice ${targetInvoice.invoiceNumber} deleted.`
  }

  private async findOrCreateCustomer(access: AccountingAccessContext): Promise<string> {
    const [existing] = await this.db
      .select({ id: schema.customers.id })
      .from(schema.customers)
      .where(eq(schema.customers.organizationId, access.tenantId))
      .orderBy(desc(schema.customers.createdAt))
      .limit(1)

    if (existing) {
      return existing.id
    }

    const created = await this.customerService.createCustomer(
      {
        address: '15 rue des Tests, 75010 Paris',
        company: `Dev Customer ${shortToken()}`,
        email: `dev-customer-${shortToken()}@example.local`,
        name: 'Dev Operator',
        note: 'Created from the dev operator console',
        phone: '+33 6 10 20 30 40',
      },
      access
    )

    return created.id
  }

  private async insertScenarioUser(
    tx: Parameters<Parameters<PostgresJsDatabase<typeof schema>['transaction']>[0]>[0],
    input: {
      email: string
      isActive?: boolean
      memberId: string
      name: string
      organizationId: string
      role: 'admin' | 'member' | 'owner'
      userId: string
    }
  ): Promise<void> {
    await tx.insert(schema.user).values({
      createdAt: new Date(),
      email: input.email,
      emailVerified: false,
      id: input.userId,
      isAnonymous: false,
      name: input.name,
      publicId: `pub_${uuidv7().replaceAll('-', '')}`,
    })

    await tx.insert(schema.member).values({
      createdAt: new Date(),
      id: input.memberId,
      isActive: input.isActive ?? true,
      organizationId: input.organizationId,
      role: input.role,
      userId: input.userId,
    })
  }

  private async resolveScenario(
    authSession: AuthResult,
    requestedTenantId?: string,
    requestedMemberId?: string
  ): Promise<ScenarioContext> {
    const accessibleTenantIds = await this.queryService.listAccessibleTenantIds(authSession.user.id)
    const requestedTenant = requestedTenantId?.trim() || ''
    const tenantId = requestedTenant || authSession.session.activeOrganizationId

    if (!tenantId) {
      throw new DomainError('Missing active tenant.', 'forbidden')
    }

    if (!accessibleTenantIds.includes(tenantId)) {
      throw new DomainError('Selected tenant is not available for this dev operator.', 'forbidden')
    }

    const members = await this.queryService.listMembersForTenant(tenantId, requestedMemberId)
    const requestedMember = requestedMemberId?.trim() || ''
    if (requestedMember && !members.some((member) => member.id === requestedMember)) {
      throw new DomainError(
        'Selected scenario member does not belong to the selected tenant.',
        'invalid_data'
      )
    }

    const selectedMember =
      members.find((member) => member.id === requestedMemberId) ??
      members.find((member) => member.userId === authSession.user.id) ??
      members[0] ??
      null

    const actorId = selectedMember?.userId ?? authSession.user.id
    return {
      access: {
        actorId,
        isAnonymous: false,
        requestId: 'dev-operator-console',
        tenantId,
      },
      actor: {
        activeTenantId: tenantId,
        isDevOperator: false,
        membershipIsActive: selectedMember?.isActive ?? false,
        membershipRole: selectedMember?.role ?? null,
        userId: actorId,
      },
      actorUserId: actorId,
      selectedMember,
      tenantId,
    }
  }

  private async toggleMemberActive(
    scenario: ScenarioContext,
    authorizationService: AuthorizationService,
    requestedMemberId?: string
  ): Promise<string> {
    const target = await this.queryService.findTargetMember(
      scenario.tenantId,
      scenario.actorUserId,
      requestedMemberId
    )

    if (!target) {
      throw new DomainError(
        'No other member is available in the selected tenant.',
        'business_logic_error'
      )
    }

    const subject = await authorizationService.membershipSubject(scenario.tenantId, target.id)
    authorizationService.authorize(scenario.actor, 'membership.toggleActive', subject ?? undefined)

    const nextActive = !target.isActive
    await this.memberService.toggleMemberActive(
      target.id,
      nextActive,
      scenario.tenantId,
      scenario.actorUserId
    )

    const membershipLabel = await this.queryService.loadUserLabel(target.userId)
    return `${membershipLabel} ${nextActive ? 'activated' : 'deactivated'}.`
  }

  private async updateCustomer(
    scenario: ScenarioContext,
    authorizationService: AuthorizationService,
    requestedCustomerId?: string
  ): Promise<string> {
    authorizationService.authorize(scenario.actor, 'accounting.writeDrafts')

    const [customer] = await this.db
      .select({
        address: schema.customers.address,
        company: schema.customers.company,
        email: schema.customers.email,
        id: schema.customers.id,
        name: schema.customers.name,
        note: schema.customers.note,
        phone: schema.customers.phone,
      })
      .from(schema.customers)
      .where(
        and(
          eq(schema.customers.organizationId, scenario.tenantId),
          requestedCustomerId ? eq(schema.customers.id, requestedCustomerId) : sql`true`
        )
      )
      .orderBy(desc(schema.customers.createdAt))
      .limit(1)

    if (!customer) {
      throw new DomainError(
        'No customer is available in the selected tenant.',
        'business_logic_error'
      )
    }

    await this.customerService.updateCustomer(
      customer.id,
      {
        address: customer.address,
        company: `${customer.company} [edited ${shortToken()}]`,
        email: customer.email,
        name: customer.name,
        note: customer.note ?? 'Updated from the dev operator console',
        phone: customer.phone,
      },
      scenario.access
    )

    return `Customer ${customer.company} updated.`
  }

  private async updateInvoiceDraft(
    scenario: ScenarioContext,
    authorizationService: AuthorizationService,
    requestedInvoiceId?: string
  ): Promise<string> {
    authorizationService.authorize(scenario.actor, 'accounting.writeDrafts')

    const [invoice] = await this.db
      .select({
        customerId: schema.invoices.customerId,
        dueDate: schema.invoices.dueDate,
        id: schema.invoices.id,
        invoiceNumber: schema.invoices.invoiceNumber,
        issueDate: schema.invoices.issueDate,
      })
      .from(schema.invoices)
      .where(
        and(
          eq(schema.invoices.organizationId, scenario.tenantId),
          eq(schema.invoices.status, 'draft'),
          requestedInvoiceId ? eq(schema.invoices.id, requestedInvoiceId) : sql`true`
        )
      )
      .orderBy(desc(schema.invoices.createdAt))
      .limit(1)

    if (!invoice) {
      throw new DomainError(
        'No draft invoice is available in the selected tenant.',
        'business_logic_error'
      )
    }

    const lines = await this.db
      .select({
        description: schema.invoiceLines.description,
        quantityCents: schema.invoiceLines.quantityCents,
        unitPriceCents: schema.invoiceLines.unitPriceCents,
        vatRateCents: schema.invoiceLines.vatRateCents,
      })
      .from(schema.invoiceLines)
      .where(eq(schema.invoiceLines.invoiceId, invoice.id))
      .orderBy(schema.invoiceLines.lineNumber)

    if (lines.length === 0) {
      throw new DomainError('Draft invoice has no editable lines.', 'business_logic_error')
    }

    await this.invoiceService.updateDraft(
      invoice.id,
      {
        customerId: invoice.customerId,
        dueDate: invoice.dueDate,
        issueDate: invoice.issueDate,
        lines: lines.map((line, index) => ({
          description:
            index === 0 ? `${line.description} [edited ${shortToken()}]` : line.description,
          quantity: line.quantityCents / 100,
          unitPrice: line.unitPriceCents / 100,
          vatRate: line.vatRateCents / 100,
        })),
      },
      scenario.access
    )

    return `Draft invoice ${invoice.invoiceNumber} updated.`
  }
}
