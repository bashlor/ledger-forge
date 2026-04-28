import type { AuthResult } from '#core/user_management/domain/authentication'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import * as schema from '#core/common/drizzle/index'
import { DomainError } from '#core/common/errors/domain_error'
import {
  type DevInspectorAuditEventDto,
  type DevInspectorCustomerDto,
  type DevInspectorExpenseDto,
  type DevInspectorMembershipDto,
  type DevInspectorMetricsDto,
  type DevInspectorTenantOptionDto,
} from '#core/dev_tools/application/dev_operator_console_types'
import {
  auditEventDetails,
  metadataErrorCode,
  metadataResult,
  selectedTenantOptions,
} from '#core/dev_tools/application/dev_operator_console_utils'
import { ensureDevToolsEnabled } from '#core/dev_tools/application/dev_tools_access'
import { type AuthorizationService } from '#core/user_management/application/authorization_service'
import { and, count, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm'

export class DevOperatorConsoleQueryService {
  constructor(private readonly db: PostgresJsDatabase<typeof schema>) {}

  async findAnyInvoice(
    tenantId: string,
    requestedInvoiceId?: string
  ): Promise<null | { id: string }> {
    await this.ensureDevToolsEnabled()
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

  async findConfirmedExpenseForDeletion(
    tenantId: string,
    requestedExpenseId?: string
  ): Promise<null | { id: string; label: string }> {
    await this.ensureDevToolsEnabled()
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

  async findCustomerForMutation(
    tenantId: string,
    requestedCustomerId?: string
  ): Promise<null | { company: string; id: string }> {
    await this.ensureDevToolsEnabled()
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

  async findDraftExpenseForConfirm(
    tenantId: string,
    requestedExpenseId?: string
  ): Promise<null | { id: string; label: string }> {
    await this.ensureDevToolsEnabled()
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

  async findDraftInvoiceForMutation(
    tenantId: string,
    requestedInvoiceId?: string
  ): Promise<null | { id: string; invoiceNumber: string }> {
    await this.ensureDevToolsEnabled()
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

  async findExpenseForDeletion(
    tenantId: string,
    requestedExpenseId?: string
  ): Promise<null | { id: string; label: string }> {
    await this.ensureDevToolsEnabled()
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

  async findInvoiceForStatusTransition(
    tenantId: string,
    requestedInvoiceId?: string
  ): Promise<null | { id: string; invoiceNumber: string; status: 'draft' | 'issued' | 'paid' }> {
    await this.ensureDevToolsEnabled()
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

  async findTargetMember(
    tenantId: string,
    actorUserId: string,
    requestedMemberId?: string
  ): Promise<null | {
    id: string
    isActive: boolean
    role: 'admin' | 'member' | 'owner'
    userId: string
  }> {
    await this.ensureDevToolsEnabled()
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

  async listAccessibleTenantIds(userId: string): Promise<string[]> {
    await this.ensureDevToolsEnabled()
    const rows = await this.db
      .select({ organizationId: schema.member.organizationId })
      .from(schema.member)
      .where(eq(schema.member.userId, userId))

    return rows.map((row) => row.organizationId)
  }

  async listAuditTrail(input: {
    activeTenantId: string
    filters: { action: string; actorId: string; search: string; tenantId: string }
    inspectableTenants: {
      id: string
      isSessionTenant: boolean
      name: string
      slug: string
    }[]
  }): Promise<{
    actors: { id: string; label: string }[]
    events: DevInspectorAuditEventDto[]
    filters: { action: string; actorId: string; search: string; tenantId: string }
    tenants: { id: string; label: string }[]
  }> {
    await this.ensureDevToolsEnabled()
    const searchPattern = input.filters.search ? `%${input.filters.search}%` : null
    const inspectableTenantIds = input.inspectableTenants.map((tenant) => tenant.id)
    const selectedTenantIds =
      input.filters.tenantId === 'all'
        ? inspectableTenantIds
        : inspectableTenantIds.filter((tenantId) => tenantId === input.filters.tenantId)

    const whereClauses = [inArray(schema.auditEvents.organizationId, selectedTenantIds)]
    if (input.filters.action) {
      whereClauses.push(eq(schema.auditEvents.action, input.filters.action))
    }
    if (input.filters.actorId) {
      whereClauses.push(eq(schema.auditEvents.actorId, input.filters.actorId))
    }
    if (searchPattern) {
      const searchClause = or(
        ilike(schema.auditEvents.action, searchPattern),
        ilike(schema.auditEvents.entityType, searchPattern),
        ilike(schema.auditEvents.entityId, searchPattern),
        ilike(schema.organization.name, searchPattern),
        sql`coalesce(${schema.user.name}, '') ilike ${searchPattern}`,
        sql`coalesce(${schema.user.email}, '') ilike ${searchPattern}`,
        sql`coalesce(${schema.auditEvents.metadata}->>'errorCode', '') ilike ${searchPattern}`
      )

      if (searchClause) {
        whereClauses.push(searchClause)
      }
    }

    const rows = await this.db
      .select({
        action: schema.auditEvents.action,
        actorEmail: schema.user.email,
        actorId: schema.auditEvents.actorId,
        actorName: schema.user.name,
        changes: schema.auditEvents.changes,
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
        details: auditEventDetails(row.changes, row.metadata),
        entityId: row.entityId,
        entityType: row.entityType,
        errorCode: metadataErrorCode(row.metadata),
        id: row.id,
        organizationId: row.organizationId,
        organizationName: row.organizationName,
        result: metadataResult(row.metadata),
        timestamp: row.timestamp,
      })),
      filters: input.filters,
      tenants: [
        { id: 'all', label: 'All tenants' },
        ...selectedTenantOptions(input.inspectableTenants),
      ],
    }
  }

  async listCustomers(tenantId: string): Promise<DevInspectorCustomerDto[]> {
    await this.ensureDevToolsEnabled()
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
      .limit(24)

    return rows
  }

  async listExpenses(tenantId: string): Promise<DevInspectorExpenseDto[]> {
    await this.ensureDevToolsEnabled()
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
      .limit(24)

    return rows.map((row) => ({
      ...row,
      status: row.status as 'confirmed' | 'draft',
    }))
  }

  async listInspectableTenants(authSession: AuthResult): Promise<DevInspectorTenantOptionDto[]> {
    await this.ensureDevToolsEnabled()
    const sessionTenantId = authSession.session.activeOrganizationId
    const rows = await this.db
      .select({
        id: schema.organization.id,
        metadata: schema.organization.metadata,
        name: schema.organization.name,
        slug: schema.organization.slug,
      })
      .from(schema.organization)
      .orderBy(schema.organization.createdAt)
    const accessibleTenantIds = new Set(await this.listAccessibleTenantIds(authSession.user.id))

    const tenants = rows.map((row) => ({
      id: row.id,
      isSessionTenant: row.id === sessionTenantId,
      name: row.name,
      slug: row.slug,
      ...tenantSource(row, {
        hasOperatorMembership: accessibleTenantIds.has(row.id),
        isSessionTenant: row.id === sessionTenantId,
      }),
    }))

    return tenants.sort((left, right) => {
      if (left.isSessionTenant === right.isSessionTenant) {
        return left.name.localeCompare(right.name)
      }

      return left.isSessionTenant ? 1 : -1
    })
  }

  async listInvoices(tenantId: string) {
    await this.ensureDevToolsEnabled()
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
      .limit(24)

    return rows.map((row) => ({
      ...row,
      status: row.status as 'draft' | 'issued' | 'paid',
    }))
  }

  async listMembersForTenant(
    tenantId: string,
    selectedMemberId?: string
  ): Promise<
    {
      email: string
      id: string
      isActive: boolean
      name: string
      role: 'admin' | 'member' | 'owner'
      userId: string
    }[]
  > {
    await this.ensureDevToolsEnabled()
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

  async listMemberships(
    authSession: AuthResult,
    authorizationService: AuthorizationService
  ): Promise<DevInspectorMembershipDto[]> {
    await this.ensureDevToolsEnabled()
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

  async loadMetrics(tenantId: string): Promise<DevInspectorMetricsDto> {
    await this.ensureDevToolsEnabled()
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

  async loadOrganization(
    organizationId: string
  ): Promise<{ id: string; name: string; slug: string }> {
    await this.ensureDevToolsEnabled()
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

  async loadUserLabel(userId: string): Promise<string> {
    await this.ensureDevToolsEnabled()
    const [row] = await this.db
      .select({ email: schema.user.email, name: schema.user.name })
      .from(schema.user)
      .where(eq(schema.user.id, userId))
      .limit(1)

    return row?.name || row?.email || userId
  }

  private async countForTable(table: any, tenantId: string): Promise<number> {
    await this.ensureDevToolsEnabled()
    const [row] = await this.db
      .select({ value: count() })
      .from(table)
      .where(eq(table.organizationId, tenantId))

    return Number(row?.value ?? 0)
  }

  private async ensureDevToolsEnabled(): Promise<void> {
    await ensureDevToolsEnabled()
  }
}

function parseOrganizationMetadata(value: null | string): Record<string, unknown> {
  if (!value) {
    return {}
  }

  try {
    const parsed = JSON.parse(value) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

function tenantSource(
  organization: { metadata: null | string; slug: string },
  flags: { hasOperatorMembership: boolean; isSessionTenant: boolean }
): Pick<DevInspectorTenantOptionDto, 'source' | 'sourceLabel'> {
  if (flags.isSessionTenant) {
    return { source: 'session_tenant', sourceLabel: 'session' }
  }

  const metadata = parseOrganizationMetadata(organization.metadata)
  if (metadata.createdBy === 'dev_operator_console') {
    return { source: 'dev_console', sourceLabel: 'dev console' }
  }
  if (metadata.workspaceKind === 'personal') {
    return { source: 'personal_workspace', sourceLabel: 'personal workspace' }
  }
  if (flags.hasOperatorMembership) {
    return { source: 'operator_membership', sourceLabel: 'operator membership' }
  }
  if (organization.slug.startsWith('single-')) {
    return { source: 'single_tenant', sourceLabel: 'single tenant' }
  }

  return { source: 'other', sourceLabel: 'other' }
}
