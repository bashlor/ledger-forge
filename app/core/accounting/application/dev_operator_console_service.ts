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
import { setActiveOrganizationForSession } from '#core/user_management/application/workspace_provisioning'
import { and, count, desc, eq, inArray, sql } from 'drizzle-orm'

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

export interface DevInspectorFilters {
  action?: string
  actorId?: string
  tenantId?: string
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
    membershipChangeRole: boolean
    membershipList: boolean
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
    userEmail: string
    userName: string
    userPublicId: string
  }
  memberships: DevInspectorMembershipDto[]
  metrics: DevInspectorMetricsDto
}

type ActionName =
  | 'attempt-forbidden-access'
  | 'change-invoice-status'
  | 'change-member-role'
  | 'clear-tenant-data'
  | 'create-expense-test'
  | 'create-invoice-test'
  | 'generate-demo-data'
  | 'reset-local-dataset'
  | 'switch-tenant'

const ACTION_NAMES: readonly ActionName[] = [
  'attempt-forbidden-access',
  'change-invoice-status',
  'change-member-role',
  'clear-tenant-data',
  'create-expense-test',
  'create-invoice-test',
  'generate-demo-data',
  'reset-local-dataset',
  'switch-tenant',
]

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

    return {
      audit: await this.listAuditTrail({
        accessibleTenantIds: tenantIds,
        activeTenantId,
        filters: {
          action: filters.action?.trim() ?? '',
          actorId: filters.actorId?.trim() ?? '',
          tenantId: selectedTenantId,
        },
      }),
      context: {
        activeTenantId,
        activeTenantName: activeTenant.name,
        activeTenantSlug: activeTenant.slug,
        currentRole: currentMembership?.role ?? null,
        environment: 'development',
        isAnonymous: authSession.user.isAnonymous,
        userEmail: authSession.user.email,
        userName: authSession.user.name ?? authSession.user.email,
        userPublicId: authSession.user.publicId,
      },
      memberships,
      metrics: await this.loadMetrics(activeTenantId),
    }
  }

  async runAction(
    authSession: AuthResult,
    action: ActionName,
    authorizationService: AuthorizationService
  ): Promise<string> {
    const access = this.accessFromSession(authSession)
    const actor = await authorizationService.actorFromSession(authSession)

    switch (action) {
      case 'attempt-forbidden-access':
        return this.attemptForbiddenAccess(actor, access, authorizationService)
      case 'change-invoice-status':
        authorizationService.authorize(actor, 'accounting.read')
        return this.changeInvoiceStatus(access, authorizationService, actor)
      case 'change-member-role':
        authorizationService.authorize(actor, 'membership.list')
        return this.changeMemberRole(authSession, authorizationService, actor)
      case 'clear-tenant-data':
        authorizationService.authorize(actor, 'invoice.markPaid')
        await new DemoDatasetService(this.db).clearTenantData(access.tenantId)
        return 'Active tenant dataset cleared.'
      case 'create-expense-test':
        authorizationService.authorize(actor, 'accounting.writeDrafts')
        return this.createExpenseTest(access)
      case 'create-invoice-test':
        authorizationService.authorize(actor, 'accounting.writeDrafts')
        return this.createInvoiceTest(access)
      case 'generate-demo-data':
        authorizationService.authorize(actor, 'invoice.markPaid')
        await new DemoDatasetService(this.db).seedTenant(access)
        return 'Demo data generated for the active tenant.'
      case 'reset-local-dataset':
        authorizationService.authorize(actor, 'invoice.markPaid')
        await new DemoDatasetService(this.db).resetTenant(access)
        return 'Local accounting dataset reset and re-seeded for the active tenant.'
      case 'switch-tenant':
        throw new DomainError(
          'Use the active tenant switch endpoint for this action.',
          'invalid_data'
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

  private accessFromSession(authSession: AuthResult): AccountingAccessContext {
    const tenantId = authSession.session.activeOrganizationId
    if (!tenantId) {
      throw new DomainError('Missing active tenant.', 'forbidden')
    }

    return {
      actorId: authSession.user.id,
      isAnonymous: authSession.user.isAnonymous,
      requestId: 'dev-operator-console',
      tenantId,
    }
  }

  private async attemptForbiddenAccess(
    actor: Awaited<ReturnType<AuthorizationService['actorFromSession']>>,
    access: AccountingAccessContext,
    authorizationService: AuthorizationService
  ): Promise<string> {
    const canMarkPaid = authorizationService.allows(actor, 'invoice.markPaid')
    if (canMarkPaid) {
      throw new DomainError(
        'Current membership can already mark invoices as paid. Switch to a lower-privilege tenant first.',
        'business_logic_error'
      )
    }

    const targetInvoice = await this.findAnyInvoice(access.tenantId)
    if (!targetInvoice) {
      throw new DomainError(
        'Create a test invoice before running the forbidden-access scenario.',
        'business_logic_error'
      )
    }

    await this.auditTrail.record(this.db, {
      action: 'dev_denied_mark_paid',
      actorId: access.actorId,
      entityId: targetInvoice.id,
      entityType: 'invoice',
      metadata: {
        attemptedAbility: 'invoice.markPaid',
        result: 'denied',
      },
      tenantId: access.tenantId,
    })

    throw new AuthorizationDeniedError(
      'Denied as expected: current membership cannot mark invoices as paid.'
    )
  }

  private async changeInvoiceStatus(
    access: AccountingAccessContext,
    authorizationService: AuthorizationService,
    actor: Awaited<ReturnType<AuthorizationService['actorFromSession']>>
  ): Promise<string> {
    const invoiceService = new InvoiceService(this.db)
    const nextTarget = await this.findInvoiceForStatusTransition(access.tenantId)

    if (!nextTarget) {
      authorizationService.authorize(actor, 'accounting.writeDrafts')
      const draftMessage = await this.createInvoiceTest(access)
      return `${draftMessage} No existing invoice could be advanced, so a fresh draft was created.`
    }

    if (nextTarget.status === 'draft') {
      authorizationService.authorize(actor, 'invoice.issue')
      await invoiceService.issueInvoice(
        nextTarget.id,
        {
          issuedCompanyAddress: '15 rue de la Paix, 75001 Paris',
          issuedCompanyName: 'Precision Ledger Dev',
        },
        access
      )
      return `Invoice ${nextTarget.invoiceNumber} issued.`
    }

    authorizationService.authorize(actor, 'invoice.markPaid')
    await invoiceService.markInvoicePaid(nextTarget.id, access)
    return `Invoice ${nextTarget.invoiceNumber} marked as paid.`
  }

  private async changeMemberRole(
    authSession: AuthResult,
    authorizationService: AuthorizationService,
    actor: Awaited<ReturnType<AuthorizationService['actorFromSession']>>
  ): Promise<string> {
    const tenantId = authSession.session.activeOrganizationId
    if (!tenantId) {
      throw new DomainError('Missing active tenant.', 'forbidden')
    }

    const [target] = await this.db
      .select({
        id: schema.member.id,
        role: schema.member.role,
        userId: schema.member.userId,
      })
      .from(schema.member)
      .where(
        and(
          eq(schema.member.organizationId, tenantId),
          sql`${schema.member.userId} <> ${authSession.user.id}`
        )
      )
      .orderBy(schema.member.createdAt)
      .limit(1)

    if (!target) {
      throw new DomainError(
        'No other member is available in the active tenant.',
        'business_logic_error'
      )
    }

    const subject = await authorizationService.membershipSubject(tenantId, target.id)
    authorizationService.authorize(actor, 'membership.changeRole', subject ?? undefined)

    const nextRole = target.role === 'admin' ? 'member' : 'admin'
    await this.db
      .update(schema.member)
      .set({ role: nextRole })
      .where(and(eq(schema.member.id, target.id), eq(schema.member.organizationId, tenantId)))

    const membershipLabel = await this.loadUserLabel(target.userId)
    await this.auditTrail.record(this.db, {
      action: 'dev_change_member_role',
      actorId: authSession.user.id,
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
      tenantId,
    })

    return `${membershipLabel} switched to ${nextRole}.`
  }

  private async countForTable(table: any, tenantId: string): Promise<number> {
    const orgColumn = 'organizationId' in table ? table.organizationId : table.organizationId
    const [row] = await this.db
      .select({ value: count() })
      .from(table)
      .where(eq(orgColumn, tenantId))

    return Number(row?.value ?? 0)
  }

  private async createExpenseTest(access: AccountingAccessContext): Promise<string> {
    const expenseService = new ExpenseService(this.db)
    const created = await expenseService.createExpense(
      {
        amount: 48,
        category: 'Software',
        date: dateOnlyUtc(new Date()),
        label: `Dev expense ${shortToken()}`,
      },
      access
    )

    return `Draft expense ${created.label} created.`
  }

  private async createInvoiceTest(access: AccountingAccessContext): Promise<string> {
    const customerId = await this.findOrCreateCustomer(access)
    const invoiceService = new InvoiceService(this.db)
    const today = dateOnlyUtc(new Date())
    const created = await invoiceService.createDraft(
      {
        customerId,
        dueDate: addDays(today, 14),
        issueDate: today,
        lines: [
          {
            description: `Dev operator invoice ${shortToken()}`,
            quantity: 1,
            unitPrice: 120,
            vatRate: 20,
          },
        ],
      },
      access
    )

    return `Draft invoice ${created.invoiceNumber} created.`
  }

  private async findAnyInvoice(tenantId: string): Promise<null | { id: string }> {
    const [row] = await this.db
      .select({ id: schema.invoices.id })
      .from(schema.invoices)
      .where(eq(schema.invoices.organizationId, tenantId))
      .orderBy(desc(schema.invoices.createdAt))
      .limit(1)

    return row ?? null
  }

  private async findInvoiceForStatusTransition(
    tenantId: string
  ): Promise<null | { id: string; invoiceNumber: string; status: 'draft' | 'issued' | 'paid' }> {
    const [draft] = await this.db
      .select({
        id: schema.invoices.id,
        invoiceNumber: schema.invoices.invoiceNumber,
        status: schema.invoices.status,
      })
      .from(schema.invoices)
      .where(and(eq(schema.invoices.organizationId, tenantId), eq(schema.invoices.status, 'draft')))
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
      .where(
        and(eq(schema.invoices.organizationId, tenantId), eq(schema.invoices.status, 'issued'))
      )
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
        isDevOperator: true,
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
          membershipChangeRole: authorizationService.allows(
            membershipActor,
            'membership.changeRole'
          ),
          membershipList: authorizationService.allows(membershipActor, 'membership.list'),
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
