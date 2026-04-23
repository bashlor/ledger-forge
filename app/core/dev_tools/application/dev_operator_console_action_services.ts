import type { CriticalAuditTrail } from '#core/accounting/application/audit/critical_audit_trail'
import type { AccountingAccessContext } from '#core/accounting/application/support/access_context'
import type {
  DevOperatorScenarioContext,
  DevOperatorScenarioMember,
} from '#core/dev_tools/application/dev_operator_console_scenario_service'
import type { AuthenticationPort } from '#core/user_management/domain/authentication'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { type CustomerService } from '#core/accounting/application/customers/index'
import { type DemoDatasetService } from '#core/accounting/application/demo/demo_dataset_service'
import { type ExpenseService } from '#core/accounting/application/expenses/index'
import { type InvoiceService } from '#core/accounting/application/invoices/index'
import * as schema from '#core/common/drizzle/index'
import { DomainError } from '#core/common/errors/domain_error'
import { type DeferredDatabaseResetLauncher } from '#core/dev_tools/application/deferred_database_reset_launcher'
import {
  addDays,
  dateOnlyUtc,
  shortToken,
} from '#core/dev_tools/application/dev_operator_console_utils'
import { type DevOperatorTenantFactoryService } from '#core/dev_tools/application/dev_operator_tenant_factory_service'
import {
  AuthorizationDeniedError,
  type AuthorizationService,
} from '#core/user_management/application/authorization_service'
import { type LocalDevDestructiveToolsService } from '#core/user_management/application/local_dev_destructive_tools_service'
import { type MemberService } from '#core/user_management/application/member_service'
import { and, desc, eq, sql } from 'drizzle-orm'

export interface DevOperatorConsoleCreateTenantInput {
  ownerEmail: string
  ownerPassword: string
  seedMode: 'empty' | 'seeded'
  tenantName: string
}

export class DevOperatorConsoleAccountingActions {
  constructor(
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly auditTrail: CriticalAuditTrail,
    private readonly customerService: CustomerService,
    private readonly expenseService: ExpenseService,
    private readonly invoiceService: InvoiceService
  ) {}

  async attemptForbiddenAccess(
    scenario: DevOperatorScenarioContext,
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

  async changeInvoiceStatus(
    scenario: DevOperatorScenarioContext,
    authorizationService: AuthorizationService,
    requestedInvoiceId?: string
  ): Promise<string> {
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

  async confirmExpense(
    scenario: DevOperatorScenarioContext,
    authorizationService: AuthorizationService,
    requestedExpenseId?: string
  ): Promise<string> {
    authorizationService.authorize(scenario.actor, 'accounting.writeDrafts')

    const targetExpense = await this.findDraftExpenseForConfirm(
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

  async createCustomerBatch(access: AccountingAccessContext, batchSize = 4): Promise<string> {
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

  async createExpenseBatch(access: AccountingAccessContext, batchSize = 3): Promise<string> {
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

  async createInvoiceBatch(access: AccountingAccessContext, batchSize = 3): Promise<string> {
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

  async deleteConfirmedExpense(
    scenario: DevOperatorScenarioContext,
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

    await this.expenseService.deleteExpense(targetExpense.id, scenario.access)
    return `Expense ${targetExpense.label} deleted.`
  }

  async deleteCustomer(
    scenario: DevOperatorScenarioContext,
    authorizationService: AuthorizationService,
    requestedCustomerId?: string
  ): Promise<string> {
    authorizationService.authorize(scenario.actor, 'accounting.writeDrafts')

    const targetCustomer = await this.findCustomerForMutation(
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

  async deleteExpense(
    scenario: DevOperatorScenarioContext,
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

    await this.expenseService.deleteExpense(targetExpense.id, scenario.access)
    return `Expense ${targetExpense.label} deleted.`
  }

  async deleteInvoice(
    scenario: DevOperatorScenarioContext,
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

    await this.invoiceService.deleteDraft(targetInvoice.id, scenario.access)
    return `Draft invoice ${targetInvoice.invoiceNumber} deleted.`
  }

  async updateCustomer(
    scenario: DevOperatorScenarioContext,
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

  async updateInvoiceDraft(
    scenario: DevOperatorScenarioContext,
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

  private async findCustomerForMutation(
    tenantId: string,
    requestedCustomerId?: string
  ): Promise<null | { company: string; id: string }> {
    const [row] = await this.db
      .select({
        company: schema.customers.company,
        id: schema.customers.id,
      })
      .from(schema.customers)
      .where(
        and(
          eq(schema.customers.organizationId, tenantId),
          requestedCustomerId ? eq(schema.customers.id, requestedCustomerId) : sql`true`
        )
      )
      .orderBy(desc(schema.customers.createdAt))
      .limit(1)

    return row ?? null
  }

  private async findDraftExpenseForConfirm(
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
          eq(schema.expenses.status, 'draft'),
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

export class DevOperatorConsoleMembershipActions {
  constructor(
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly memberService: MemberService,
    private readonly auditTrail: CriticalAuditTrail,
    private readonly queryService: {
      loadUserLabel(userId: string): Promise<string>
    }
  ) {}

  async changeMemberRole(
    scenario: DevOperatorScenarioContext,
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

  async toggleMemberActive(
    scenario: DevOperatorScenarioContext,
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
    await this.memberService.toggleMemberActive(
      target.id,
      nextActive,
      scenario.tenantId,
      scenario.actorUserId
    )

    return `${target.name} ${nextActive ? 'activated' : 'deactivated'}.`
  }

  private async findTargetMember(
    tenantId: string,
    actorUserId: string,
    requestedMemberId?: string
  ): Promise<DevOperatorScenarioMember | null> {
    const [row] = await this.db
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
      .where(
        requestedMemberId
          ? and(eq(schema.member.organizationId, tenantId), eq(schema.member.id, requestedMemberId))
          : and(
              eq(schema.member.organizationId, tenantId),
              sql`${schema.member.userId} <> ${actorUserId}`
            )
      )
      .orderBy(desc(schema.member.createdAt))
      .limit(1)

    return row
      ? {
          ...row,
          role: row.role as 'admin' | 'member' | 'owner',
        }
      : null
  }
}

function normalizeEmail(value: string | undefined): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
}
