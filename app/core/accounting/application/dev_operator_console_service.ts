import type { AuthResult } from '#core/user_management/domain/authentication'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { DatabaseCriticalAuditTrail } from '#core/accounting/application/audit/critical_audit_trail'
import { CustomerService } from '#core/accounting/application/customers/index'
import { DemoDatasetService } from '#core/accounting/application/demo/demo_dataset_service'
import { ExpenseService } from '#core/accounting/application/expenses/index'
import { InvoiceService } from '#core/accounting/application/invoices/index'
import { type AccountingAccessContext } from '#core/accounting/application/support/access_context'
import * as schema from '#core/common/drizzle/index'
import { DomainError } from '#core/common/errors/domain_error'
import {
  AuthorizationDeniedError,
  type AuthorizationService,
} from '#core/user_management/application/authorization_service'
import { MemberService } from '#core/user_management/application/member_service'
import { setActiveOrganizationForSession } from '#core/user_management/application/workspace_provisioning'
import { and, count, desc, eq, inArray, sql } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'

export interface DevInspectorAuditEventDto {
  action: string
  actorEmail: null | string
  actorId: null | string
  actorName: null | string
  entityId: string
  entityType: string
  id: string
  organizationId: string
  organizationName: string
  result: 'denied' | 'error' | 'success'
  timestamp: Date
}

export interface DevInspectorCustomerDto {
  company: string
  createdAt: Date
  email: string
  id: string
  name: string
  phone: string
}

export interface DevInspectorExpenseDto {
  amountCents: number
  category: string
  createdAt: Date
  date: string
  id: string
  label: string
  status: 'confirmed' | 'draft'
}

export interface DevInspectorFilters {
  action?: string
  actorId?: string
  expenseId?: string
  invoiceId?: string
  memberId?: string
  tenantId?: string
}

export interface DevInspectorInvoiceDto {
  createdAt: Date
  customerCompanyName: string
  dueDate: string
  id: string
  invoiceNumber: string
  issueDate: string
  status: 'draft' | 'issued' | 'paid'
  totalInclTaxCents: number
}

export interface DevInspectorMemberDto {
  email: string
  id: string
  isActive: boolean
  isCurrentActor: boolean
  name: string
  role: 'admin' | 'member' | 'owner'
  userId: string
}

export interface DevInspectorMembershipDto {
  id: string
  isActive: boolean
  isCurrent: boolean
  organizationId: string
  organizationName: string
  organizationSlug: string
  permissions: {
    accountingRead: boolean
    accountingWriteDrafts: boolean
    auditTrailView: boolean
    invoiceIssue: boolean
    invoiceMarkPaid: boolean
    membershipChangeRole: boolean
    membershipList: boolean
    membershipToggleActive: boolean
  }
  role: 'admin' | 'member' | 'owner'
}

export interface DevInspectorMetricsDto {
  auditEvents: number
  customers: number
  expenses: number
  invoices: number
  members: number
}

export interface DevInspectorPageDto {
  audit: {
    actors: { id: string; label: string }[]
    events: DevInspectorAuditEventDto[]
    filters: {
      action: string
      actorId: string
      tenantId: string
    }
    tenants: { id: string; label: string }[]
  }
  context: {
    activeTenantId: string
    activeTenantName: string
    activeTenantSlug: string
    currentRole: 'admin' | 'member' | 'owner' | null
    environment: 'development'
    isAnonymous: boolean
    readOnlyBadge: string
    selectedMemberId: string
    selectedMemberName: string
    selectedMemberPermissions: {
      accountingRead: boolean
      accountingWriteDrafts: boolean
      auditTrailView: boolean
      invoiceIssue: boolean
      invoiceMarkPaid: boolean
      membershipChangeRole: boolean
      membershipList: boolean
      membershipToggleActive: boolean
    }
    selectedMemberRole: 'admin' | 'member' | 'owner' | null
    selectedTenantId: string
    selectedTenantName: string
    userEmail: string
    userName: string
    userPublicId: string
  }
  customers: DevInspectorCustomerDto[]
  expenses: DevInspectorExpenseDto[]
  invoices: DevInspectorInvoiceDto[]
  members: DevInspectorMemberDto[]
  memberships: DevInspectorMembershipDto[]
  metrics: DevInspectorMetricsDto
}

export interface DevOperatorActionInput {
  customerId?: string
  expenseId?: string
  invoiceId?: string
  memberId?: string
  tenantId?: string
}

type ActionName =
  | 'attempt-forbidden-access'
  | 'change-invoice-status'
  | 'change-member-role'
  | 'clear-tenant-data'
  | 'create-customer-batch'
  | 'create-expense-test'
  | 'create-invoice-test'
  | 'create-tenant-scenario'
  | 'create-tenant-scenario-seeded'
  | 'delete-confirmed-expense'
  | 'delete-expense'
  | 'delete-invoice'
  | 'generate-demo-data'
  | 'reset-local-dataset'
  | 'switch-tenant'
  | 'toggle-member-active'
  | 'update-invoice-draft'

const ACTION_NAMES: readonly ActionName[] = [
  'attempt-forbidden-access',
  'change-invoice-status',
  'change-member-role',
  'clear-tenant-data',
  'create-customer-batch',
  'create-expense-test',
  'create-invoice-test',
  'create-tenant-scenario',
  'create-tenant-scenario-seeded',
  'delete-confirmed-expense',
  'delete-expense',
  'delete-invoice',
  'generate-demo-data',
  'reset-local-dataset',
  'switch-tenant',
  'toggle-member-active',
  'update-invoice-draft',
]

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
  private readonly auditTrail = new DatabaseCriticalAuditTrail()

  constructor(private readonly db: PostgresJsDatabase<typeof schema>) {}

  async getPageData(
    authSession: AuthResult,
    authorizationService: AuthorizationService,
    filters: DevInspectorFilters = {}
  ): Promise<DevInspectorPageDto> {
    const memberships = await this.listMemberships(authSession, authorizationService)
    const activeTenantId = authSession.session.activeOrganizationId
    if (!activeTenantId) {
      throw new DomainError('Missing active tenant.', 'forbidden')
    }

    const currentMembership =
      memberships.find((membership) => membership.organizationId === activeTenantId) ?? null
    const activeTenant = currentMembership
      ? {
          id: currentMembership.organizationId,
          name: currentMembership.organizationName,
          slug: currentMembership.organizationSlug,
        }
      : await this.loadOrganization(activeTenantId)

    const tenantIds = memberships.map((membership) => membership.organizationId)
    const selectedTenantId =
      filters.tenantId && tenantIds.includes(filters.tenantId) ? filters.tenantId : activeTenantId
    const selectedTenant =
      memberships.find((membership) => membership.organizationId === selectedTenantId) ??
      currentMembership ??
      null

    const members = await this.listMembersForTenant(selectedTenantId, filters.memberId)
    const selectedMember =
      members.find((member) => member.id === filters.memberId) ??
      members.find((member) => member.userId === authSession.user.id) ??
      members[0] ??
      null
    const selectedMemberActor = {
      activeTenantId: selectedTenantId,
      isDevOperator: false,
      membershipIsActive: selectedMember?.isActive ?? false,
      membershipRole: selectedMember?.role ?? null,
      userId: selectedMember?.userId ?? null,
    }

    return {
      audit: await this.listAuditTrail({
        accessibleTenantIds: tenantIds,
        activeTenantId,
        filters: {
          action: filters.action?.trim() ?? '',
          actorId: filters.actorId?.trim() ?? '',
          tenantId:
            filters.tenantId?.trim() &&
            (filters.tenantId === 'all' || tenantIds.includes(filters.tenantId))
              ? filters.tenantId.trim()
              : selectedTenantId,
        },
      }),
      context: {
        activeTenantId,
        activeTenantName: activeTenant.name,
        activeTenantSlug: activeTenant.slug,
        currentRole: currentMembership?.role ?? null,
        environment: 'development',
        isAnonymous: authSession.user.isAnonymous,
        readOnlyBadge: 'Read-Only Access',
        selectedMemberId: selectedMember?.id ?? '',
        selectedMemberName: selectedMember?.name ?? selectedMember?.email ?? 'No member selected',
        selectedMemberPermissions: {
          accountingRead: authorizationService.allows(selectedMemberActor, 'accounting.read'),
          accountingWriteDrafts: authorizationService.allows(
            selectedMemberActor,
            'accounting.writeDrafts'
          ),
          auditTrailView: authorizationService.allows(selectedMemberActor, 'auditTrail.view'),
          invoiceIssue: authorizationService.allows(selectedMemberActor, 'invoice.issue'),
          invoiceMarkPaid: authorizationService.allows(selectedMemberActor, 'invoice.markPaid'),
          membershipChangeRole: authorizationService.allows(
            selectedMemberActor,
            'membership.changeRole'
          ),
          membershipList: authorizationService.allows(selectedMemberActor, 'membership.list'),
          membershipToggleActive: authorizationService.allows(
            selectedMemberActor,
            'membership.toggleActive'
          ),
        },
        selectedMemberRole: selectedMember?.role ?? null,
        selectedTenantId,
        selectedTenantName: selectedTenant?.organizationName ?? activeTenant.name,
        userEmail: authSession.user.email,
        userName: authSession.user.name ?? authSession.user.email,
        userPublicId: authSession.user.publicId,
      },
      customers: await this.listCustomers(selectedTenantId),
      expenses: await this.listExpenses(selectedTenantId),
      invoices: await this.listInvoices(selectedTenantId),
      members: members.map((member) => ({
        ...member,
        isCurrentActor: member.id === selectedMember?.id,
      })),
      memberships,
      metrics: await this.loadMetrics(selectedTenantId),
    }
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
        await new DemoDatasetService(this.db).clearTenantData(scenario.tenantId)
        return 'Selected tenant dataset cleared.'
      case 'create-customer-batch':
        authorizationService.authorize(scenario.actor, 'accounting.writeDrafts')
        return this.createCustomerBatch(scenario.access)
      case 'create-expense-test':
        authorizationService.authorize(scenario.actor, 'accounting.writeDrafts')
        return this.createExpenseBatch(scenario.access)
      case 'create-invoice-test':
        authorizationService.authorize(scenario.actor, 'accounting.writeDrafts')
        return this.createInvoiceBatch(scenario.access)
      case 'create-tenant-scenario':
        return this.createTenantScenario(authSession.user.id, false)
      case 'create-tenant-scenario-seeded':
        return this.createTenantScenario(authSession.user.id, true)
      case 'delete-confirmed-expense':
        return this.deleteConfirmedExpense(scenario, authorizationService, input.expenseId)
      case 'delete-expense':
        return this.deleteExpense(scenario, authorizationService, input.expenseId)
      case 'delete-invoice':
        return this.deleteInvoice(scenario, authorizationService, input.invoiceId)
      case 'generate-demo-data':
        authorizationService.authorize(scenario.actor, 'invoice.markPaid')
        await new DemoDatasetService(this.db).seedTenant(scenario.access)
        return 'Demo data generated for the selected tenant.'
      case 'reset-local-dataset':
        authorizationService.authorize(scenario.actor, 'invoice.markPaid')
        await new DemoDatasetService(this.db).resetTenant(scenario.access)
        return 'Selected tenant dataset reset and re-seeded.'
      case 'switch-tenant':
        throw new DomainError(
          'Use the active tenant switch endpoint for this action.',
          'invalid_data'
        )
      case 'toggle-member-active':
        return this.toggleMemberActive(scenario, authorizationService, input.memberId)
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

    const targetInvoice = await this.findAnyInvoice(scenario.tenantId, requestedInvoiceId)
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
    const invoiceService = new InvoiceService(this.db)
    const nextTarget = await this.findInvoiceForStatusTransition(
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
      await invoiceService.issueInvoice(
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
    await invoiceService.markInvoicePaid(nextTarget.id, scenario.access)
    return `Invoice ${nextTarget.invoiceNumber} marked as paid.`
  }

  private async changeMemberRole(
    scenario: ScenarioContext,
    authorizationService: AuthorizationService,
    requestedMemberId?: string
  ): Promise<string> {
    const target = await this.findTargetMember(
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
    await new MemberService(this.db).updateMemberRole(target.id, nextRole, scenario.tenantId)

    const membershipLabel = await this.loadUserLabel(target.userId)
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

  private async countForTable(table: any, tenantId: string): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(table)
      .where(eq(table.organizationId, tenantId))

    return Number(row?.value ?? 0)
  }

  private async createCustomerBatch(
    access: AccountingAccessContext,
    batchSize = 4
  ): Promise<string> {
    const customerService = new CustomerService(this.db)

    for (let index = 0; index < batchSize; index++) {
      const suffix = shortToken()
      await customerService.createCustomer(
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
    const expenseService = new ExpenseService(this.db)

    for (let index = 0; index < batchSize; index++) {
      await expenseService.createExpense(
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
    const invoiceService = new InvoiceService(this.db)
    const today = dateOnlyUtc(new Date())

    for (let index = 0; index < batchSize; index++) {
      const customerId = await this.findOrCreateCustomer(access)
      await invoiceService.createDraft(
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
      await new DemoDatasetService(this.db).seedTenant({
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

    const targetExpense = await this.findConfirmedExpenseForDeletion(
      scenario.tenantId,
      requestedExpenseId
    )
    if (!targetExpense) {
      throw new DomainError(
        'No confirmed expense is available in the selected tenant.',
        'business_logic_error'
      )
    }

    await new ExpenseService(this.db).deleteExpense(targetExpense.id, scenario.access)
    return `Expense ${targetExpense.label} deleted.`
  }

  private async deleteExpense(
    scenario: ScenarioContext,
    authorizationService: AuthorizationService,
    requestedExpenseId?: string
  ): Promise<string> {
    authorizationService.authorize(scenario.actor, 'accounting.writeDrafts')

    const targetExpense = await this.findExpenseForDeletion(scenario.tenantId, requestedExpenseId)
    if (!targetExpense) {
      throw new DomainError(
        'No expense is available in the selected tenant.',
        'business_logic_error'
      )
    }

    await new ExpenseService(this.db).deleteExpense(targetExpense.id, scenario.access)
    return `Expense ${targetExpense.label} deleted.`
  }

  private async deleteInvoice(
    scenario: ScenarioContext,
    authorizationService: AuthorizationService,
    requestedInvoiceId?: string
  ): Promise<string> {
    authorizationService.authorize(scenario.actor, 'accounting.writeDrafts')

    const targetInvoice = await this.findDraftInvoiceForMutation(
      scenario.tenantId,
      requestedInvoiceId
    )
    if (!targetInvoice) {
      throw new DomainError(
        'No draft invoice is available in the selected tenant.',
        'business_logic_error'
      )
    }

    await new InvoiceService(this.db).deleteDraft(targetInvoice.id, scenario.access)
    return `Draft invoice ${targetInvoice.invoiceNumber} deleted.`
  }

  private async findAnyInvoice(
    tenantId: string,
    requestedInvoiceId?: string
  ): Promise<null | { id: string }> {
    const [row] = await this.db
      .select({ id: schema.invoices.id })
      .from(schema.invoices)
      .where(
        requestedInvoiceId
          ? and(
              eq(schema.invoices.organizationId, tenantId),
              eq(schema.invoices.id, requestedInvoiceId)
            )
          : eq(schema.invoices.organizationId, tenantId)
      )
      .orderBy(desc(schema.invoices.createdAt))
      .limit(1)

    return row ?? null
  }

  private async findConfirmedExpenseForDeletion(
    tenantId: string,
    requestedExpenseId?: string
  ): Promise<null | { id: string; label: string }> {
    const [row] = await this.db
      .select({
        id: schema.expenses.id,
        label: schema.expenses.label,
      })
      .from(schema.expenses)
      .where(
        and(
          eq(schema.expenses.organizationId, tenantId),
          eq(schema.expenses.status, 'confirmed'),
          requestedExpenseId ? eq(schema.expenses.id, requestedExpenseId) : sql`true`
        )
      )
      .orderBy(desc(schema.expenses.createdAt))
      .limit(1)

    return row ?? null
  }

  private async findDraftInvoiceForMutation(
    tenantId: string,
    requestedInvoiceId?: string
  ): Promise<null | { id: string; invoiceNumber: string }> {
    const [row] = await this.db
      .select({
        id: schema.invoices.id,
        invoiceNumber: schema.invoices.invoiceNumber,
      })
      .from(schema.invoices)
      .where(
        and(
          eq(schema.invoices.organizationId, tenantId),
          eq(schema.invoices.status, 'draft'),
          requestedInvoiceId ? eq(schema.invoices.id, requestedInvoiceId) : sql`true`
        )
      )
      .orderBy(desc(schema.invoices.createdAt))
      .limit(1)

    return row ?? null
  }

  private async findExpenseForDeletion(
    tenantId: string,
    requestedExpenseId?: string
  ): Promise<null | { id: string; label: string }> {
    const [row] = await this.db
      .select({
        id: schema.expenses.id,
        label: schema.expenses.label,
      })
      .from(schema.expenses)
      .where(
        and(
          eq(schema.expenses.organizationId, tenantId),
          requestedExpenseId ? eq(schema.expenses.id, requestedExpenseId) : sql`true`
        )
      )
      .orderBy(desc(schema.expenses.createdAt))
      .limit(1)

    return row ?? null
  }

  private async findInvoiceForStatusTransition(
    tenantId: string,
    requestedInvoiceId?: string
  ): Promise<null | { id: string; invoiceNumber: string; status: 'draft' | 'issued' | 'paid' }> {
    const baseCondition = and(
      eq(schema.invoices.organizationId, tenantId),
      requestedInvoiceId ? eq(schema.invoices.id, requestedInvoiceId) : sql`true`
    )

    const [draft] = await this.db
      .select({
        id: schema.invoices.id,
        invoiceNumber: schema.invoices.invoiceNumber,
        status: schema.invoices.status,
      })
      .from(schema.invoices)
      .where(and(baseCondition, eq(schema.invoices.status, 'draft')))
      .orderBy(desc(schema.invoices.createdAt))
      .limit(1)

    if (draft) {
      return draft
    }

    const [issued] = await this.db
      .select({
        id: schema.invoices.id,
        invoiceNumber: schema.invoices.invoiceNumber,
        status: schema.invoices.status,
      })
      .from(schema.invoices)
      .where(and(baseCondition, eq(schema.invoices.status, 'issued')))
      .orderBy(desc(schema.invoices.createdAt))
      .limit(1)

    return issued ?? null
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

    const customerService = new CustomerService(this.db)
    const created = await customerService.createCustomer(
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

  private async findTargetMember(
    tenantId: string,
    actorUserId: string,
    requestedMemberId?: string
  ): Promise<null | {
    id: string
    isActive: boolean
    role: 'admin' | 'member' | 'owner'
    userId: string
  }> {
    const [row] = await this.db
      .select({
        id: schema.member.id,
        isActive: schema.member.isActive,
        role: schema.member.role,
        userId: schema.member.userId,
      })
      .from(schema.member)
      .where(
        requestedMemberId
          ? and(eq(schema.member.organizationId, tenantId), eq(schema.member.id, requestedMemberId))
          : and(
              eq(schema.member.organizationId, tenantId),
              sql`${schema.member.userId} <> ${actorUserId}`
            )
      )
      .orderBy(schema.member.createdAt)
      .limit(1)

    return row
      ? {
          ...row,
          role: row.role as 'admin' | 'member' | 'owner',
        }
      : null
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

  private async listAccessibleTenantIds(userId: string): Promise<string[]> {
    const rows = await this.db
      .select({ organizationId: schema.member.organizationId })
      .from(schema.member)
      .where(eq(schema.member.userId, userId))

    return rows.map((row) => row.organizationId)
  }

  private async listAuditTrail(input: {
    accessibleTenantIds: string[]
    activeTenantId: string
    filters: { action: string; actorId: string; tenantId: string }
  }): Promise<DevInspectorPageDto['audit']> {
    const selectedTenantIds =
      input.filters.tenantId === 'all'
        ? input.accessibleTenantIds
        : input.accessibleTenantIds.filter((tenantId) => tenantId === input.filters.tenantId)

    const whereClauses = [inArray(schema.auditEvents.organizationId, selectedTenantIds)]
    if (input.filters.action) {
      whereClauses.push(eq(schema.auditEvents.action, input.filters.action))
    }
    if (input.filters.actorId) {
      whereClauses.push(eq(schema.auditEvents.actorId, input.filters.actorId))
    }

    const rows = await this.db
      .select({
        action: schema.auditEvents.action,
        actorEmail: schema.user.email,
        actorId: schema.auditEvents.actorId,
        actorName: schema.user.name,
        entityId: schema.auditEvents.entityId,
        entityType: schema.auditEvents.entityType,
        id: schema.auditEvents.id,
        metadata: schema.auditEvents.metadata,
        organizationId: schema.auditEvents.organizationId,
        organizationName: schema.organization.name,
        timestamp: schema.auditEvents.createdAt,
      })
      .from(schema.auditEvents)
      .innerJoin(schema.organization, eq(schema.auditEvents.organizationId, schema.organization.id))
      .leftJoin(schema.user, eq(schema.auditEvents.actorId, schema.user.id))
      .where(and(...whereClauses))
      .orderBy(desc(schema.auditEvents.createdAt))
      .limit(40)

    const actors = new Map<string, string>()
    for (const row of rows) {
      if (row.actorId) {
        actors.set(row.actorId, row.actorName || row.actorEmail || row.actorId)
      }
    }

    return {
      actors: [...actors.entries()].map(([id, label]) => ({ id, label })),
      events: rows.map((row) => ({
        action: row.action,
        actorEmail: row.actorEmail,
        actorId: row.actorId,
        actorName: row.actorName,
        entityId: row.entityId,
        entityType: row.entityType,
        id: row.id,
        organizationId: row.organizationId,
        organizationName: row.organizationName,
        result: metadataResult(row.metadata),
        timestamp: row.timestamp,
      })),
      filters: input.filters,
      tenants: [
        { id: 'all', label: 'All memberships' },
        ...selectedTenantOptions(input.accessibleTenantIds, input.activeTenantId),
      ],
    }
  }

  private async listCustomers(tenantId: string): Promise<DevInspectorCustomerDto[]> {
    const rows = await this.db
      .select({
        company: schema.customers.company,
        createdAt: schema.customers.createdAt,
        email: schema.customers.email,
        id: schema.customers.id,
        name: schema.customers.name,
        phone: schema.customers.phone,
      })
      .from(schema.customers)
      .where(eq(schema.customers.organizationId, tenantId))
      .orderBy(desc(schema.customers.createdAt))
      .limit(8)

    return rows
  }

  private async listExpenses(tenantId: string): Promise<DevInspectorExpenseDto[]> {
    const rows = await this.db
      .select({
        amountCents: schema.expenses.amountCents,
        category: schema.expenses.category,
        createdAt: schema.expenses.createdAt,
        date: schema.expenses.date,
        id: schema.expenses.id,
        label: schema.expenses.label,
        status: schema.expenses.status,
      })
      .from(schema.expenses)
      .where(eq(schema.expenses.organizationId, tenantId))
      .orderBy(desc(schema.expenses.createdAt))
      .limit(8)

    return rows.map((row) => ({
      ...row,
      status: row.status as 'confirmed' | 'draft',
    }))
  }

  private async listInvoices(tenantId: string): Promise<DevInspectorInvoiceDto[]> {
    const rows = await this.db
      .select({
        createdAt: schema.invoices.createdAt,
        customerCompanyName: schema.invoices.customerCompanyName,
        dueDate: schema.invoices.dueDate,
        id: schema.invoices.id,
        invoiceNumber: schema.invoices.invoiceNumber,
        issueDate: schema.invoices.issueDate,
        status: schema.invoices.status,
        totalInclTaxCents: schema.invoices.totalInclTaxCents,
      })
      .from(schema.invoices)
      .where(eq(schema.invoices.organizationId, tenantId))
      .orderBy(desc(schema.invoices.createdAt))
      .limit(8)

    return rows.map((row) => ({
      ...row,
      status: row.status as 'draft' | 'issued' | 'paid',
    }))
  }

  private async listMembersForTenant(
    tenantId: string,
    selectedMemberId?: string
  ): Promise<ScenarioMember[]> {
    const query = this.db
      .select({
        email: schema.user.email,
        id: schema.member.id,
        isActive: schema.member.isActive,
        name: schema.user.name,
        role: schema.member.role,
        userId: schema.member.userId,
      })
      .from(schema.member)
      .innerJoin(schema.user, eq(schema.member.userId, schema.user.id))
      .where(eq(schema.member.organizationId, tenantId))

    const rows = selectedMemberId
      ? await query.orderBy(
          sql`${schema.member.id} = ${selectedMemberId} desc`,
          schema.member.createdAt
        )
      : await query.orderBy(schema.member.createdAt)

    return rows.map((row) => ({
      ...row,
      role: row.role as 'admin' | 'member' | 'owner',
    }))
  }

  private async listMemberships(
    authSession: AuthResult,
    authorizationService: AuthorizationService
  ): Promise<DevInspectorMembershipDto[]> {
    const rows = await this.db
      .select({
        id: schema.member.id,
        isActive: schema.member.isActive,
        organizationId: schema.member.organizationId,
        organizationName: schema.organization.name,
        organizationSlug: schema.organization.slug,
        role: schema.member.role,
      })
      .from(schema.member)
      .innerJoin(schema.organization, eq(schema.member.organizationId, schema.organization.id))
      .where(eq(schema.member.userId, authSession.user.id))
      .orderBy(schema.organization.createdAt, schema.member.createdAt)

    return rows.map((row) => {
      const membershipRole = row.role as DevInspectorMembershipDto['role']
      const membershipActor = {
        activeTenantId: row.organizationId,
        isDevOperator: false,
        membershipIsActive: row.isActive,
        membershipRole,
        userId: authSession.user.id,
      }

      return {
        id: row.id,
        isActive: row.isActive,
        isCurrent: authSession.session.activeOrganizationId === row.organizationId,
        organizationId: row.organizationId,
        organizationName: row.organizationName,
        organizationSlug: row.organizationSlug,
        permissions: {
          accountingRead: authorizationService.allows(membershipActor, 'accounting.read'),
          accountingWriteDrafts: authorizationService.allows(
            membershipActor,
            'accounting.writeDrafts'
          ),
          auditTrailView: authorizationService.allows(membershipActor, 'auditTrail.view'),
          invoiceIssue: authorizationService.allows(membershipActor, 'invoice.issue'),
          invoiceMarkPaid: authorizationService.allows(membershipActor, 'invoice.markPaid'),
          membershipChangeRole: authorizationService.allows(
            membershipActor,
            'membership.changeRole'
          ),
          membershipList: authorizationService.allows(membershipActor, 'membership.list'),
          membershipToggleActive: authorizationService.allows(
            membershipActor,
            'membership.toggleActive'
          ),
        },
        role: membershipRole,
      }
    })
  }

  private async loadMetrics(tenantId: string): Promise<DevInspectorMetricsDto> {
    const [invoiceCount, expenseCount, customerCount, auditEventCount, memberCount] =
      await Promise.all([
        this.countForTable(schema.invoices, tenantId),
        this.countForTable(schema.expenses, tenantId),
        this.countForTable(schema.customers, tenantId),
        this.countForTable(schema.auditEvents, tenantId),
        this.countForTable(schema.member, tenantId),
      ])

    return {
      auditEvents: auditEventCount,
      customers: customerCount,
      expenses: expenseCount,
      invoices: invoiceCount,
      members: memberCount,
    }
  }

  private async loadOrganization(
    organizationId: string
  ): Promise<{ id: string; name: string; slug: string }> {
    const [row] = await this.db
      .select({
        id: schema.organization.id,
        name: schema.organization.name,
        slug: schema.organization.slug,
      })
      .from(schema.organization)
      .where(eq(schema.organization.id, organizationId))
      .limit(1)

    if (!row) {
      throw new DomainError('Active organization not found.', 'not_found')
    }

    return row
  }

  private async loadUserLabel(userId: string): Promise<string> {
    const [row] = await this.db
      .select({ email: schema.user.email, name: schema.user.name })
      .from(schema.user)
      .where(eq(schema.user.id, userId))
      .limit(1)

    return row?.name || row?.email || userId
  }

  private async resolveScenario(
    authSession: AuthResult,
    requestedTenantId?: string,
    requestedMemberId?: string
  ): Promise<ScenarioContext> {
    const accessibleTenantIds = await this.listAccessibleTenantIds(authSession.user.id)
    const requestedTenant = requestedTenantId?.trim() || ''
    const tenantId = requestedTenant || authSession.session.activeOrganizationId

    if (!tenantId) {
      throw new DomainError('Missing active tenant.', 'forbidden')
    }

    if (!accessibleTenantIds.includes(tenantId)) {
      throw new DomainError('Selected tenant is not available for this dev operator.', 'forbidden')
    }

    const members = await this.listMembersForTenant(tenantId, requestedMemberId)
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
    const target = await this.findTargetMember(
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
    await new MemberService(this.db).toggleMemberActive(
      target.id,
      nextActive,
      scenario.tenantId,
      scenario.actorUserId
    )

    const membershipLabel = await this.loadUserLabel(target.userId)
    return `${membershipLabel} ${nextActive ? 'activated' : 'deactivated'}.`
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

    await new InvoiceService(this.db).updateDraft(
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

export function isDevOperatorActionName(value: string): value is ActionName {
  return ACTION_NAMES.includes(value as ActionName)
}

function addDays(value: string, days: number): string {
  const [year, month, day] = value.split('-').map(Number)
  return dateOnlyUtc(new Date(Date.UTC(year, month - 1, day + days)))
}

function dateOnlyUtc(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function metadataResult(value: unknown): 'denied' | 'error' | 'success' {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return 'success'
  }

  const candidate = (value as Record<string, unknown>).result
  return candidate === 'denied' || candidate === 'error' ? candidate : 'success'
}

function selectedTenantOptions(accessibleTenantIds: string[], activeTenantId: string) {
  return accessibleTenantIds.map((tenantId) => ({
    id: tenantId,
    label: tenantId === activeTenantId ? `${tenantId} (active)` : tenantId,
  }))
}

function shortToken(): string {
  return Math.random().toString(36).slice(2, 8)
}
