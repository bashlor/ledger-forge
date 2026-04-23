import type { AuthResult } from '#core/user_management/domain/authentication'

import { DomainError } from '#core/common/errors/domain_error'
import { type DevOperatorConsoleQueryService } from '#core/dev_tools/application/dev_operator_console_query_service'
import {
  type DevInspectorFilters,
  type DevInspectorMembershipDto,
  type DevInspectorPageDto,
} from '#core/dev_tools/application/dev_operator_console_types'
import {
  resolveActiveTab,
  resolveMemberRole,
  resolveMemberStatus,
  resolveProbeType,
} from '#core/dev_tools/application/dev_operator_console_utils'
import { type AuthorizationService } from '#core/user_management/application/authorization_service'
import { isSingleTenantMode } from '#core/user_management/support/tenant_mode'

interface TenantSelection {
  activeTenant: { id: string; name: string; slug: string }
  currentMembership: DevInspectorMembershipDto | null
  inspectableTenants: DevInspectorPageDto['inspectableTenants']
  selectedTenant: DevInspectorMembershipDto | null
  selectedTenantId: string
  selectedTenantOption: DevInspectorPageDto['inspectableTenants'][number]
}

export class DevOperatorConsolePageService {
  constructor(
    private readonly queryService: DevOperatorConsoleQueryService,
    private readonly singleTenantMode: boolean = isSingleTenantMode(),
    private readonly localDestructiveToolsEnabled: boolean = false
  ) {}

  async getPageData(
    authSession: AuthResult,
    authorizationService: AuthorizationService,
    filters: DevInspectorFilters = {}
  ): Promise<DevInspectorPageDto> {
    const memberships = await this.queryService.listMemberships(authSession, authorizationService)
    const inspectableTenants = await this.queryService.listInspectableTenants(authSession)
    const tenantSelection = await this.resolveTenantSelection(
      inspectableTenants,
      memberships,
      authSession.session.activeOrganizationId,
      filters.tenantId
    )
    const members = await this.queryService.listMembersForTenant(
      tenantSelection.selectedTenantId,
      filters.memberId
    )
    const selectedMember = this.resolveSelectedMember(
      members,
      authSession.user.id,
      filters.memberId
    )
    const auditFilters = this.buildAuditFilters(
      filters,
      tenantSelection.inspectableTenants.map((tenant) => tenant.id),
      tenantSelection.selectedTenantId
    )

    const [audit, customers, expenses, invoices, metrics] = await Promise.all([
      this.queryService.listAuditTrail({
        activeTenantId: tenantSelection.activeTenant.id,
        filters: auditFilters,
        inspectableTenants: tenantSelection.inspectableTenants,
      }),
      this.queryService.listCustomers(tenantSelection.selectedTenantId),
      this.queryService.listExpenses(tenantSelection.selectedTenantId),
      this.queryService.listInvoices(tenantSelection.selectedTenantId),
      this.queryService.loadMetrics(tenantSelection.selectedTenantId),
    ])

    return {
      audit,
      context: this.buildPageContext(
        authSession,
        authorizationService,
        tenantSelection,
        selectedMember
      ),
      customers,
      expenses,
      globalOperations: this.buildGlobalOperations(
        this.singleTenantMode,
        this.localDestructiveToolsEnabled
      ),
      inspectableTenants: tenantSelection.inspectableTenants,
      invoices,
      members: members.map((member) => ({
        ...member,
        isCurrentActor: member.id === selectedMember?.id,
      })),
      memberships,
      metrics,
      recentActions: this.buildRecentActions(audit),
      view: this.buildView(filters),
    }
  }

  private buildAuditFilters(
    filters: DevInspectorFilters,
    tenantIds: string[],
    selectedTenantId: string
  ): DevInspectorPageDto['audit']['filters'] {
    const requestedTenantId = filters.tenantId?.trim()

    return {
      action: filters.action?.trim() ?? '',
      actorId: filters.actorId?.trim() ?? '',
      search: filters.auditSearch?.trim() ?? '',
      tenantId:
        requestedTenantId && (requestedTenantId === 'all' || tenantIds.includes(requestedTenantId))
          ? requestedTenantId
          : selectedTenantId,
    }
  }

  private buildGlobalOperations(
    singleTenantMode: boolean,
    localDestructiveToolsEnabled: boolean
  ): DevInspectorPageDto['globalOperations'] {
    return [
      {
        action: 'create-tenant',
        available: !singleTenantMode,
        id: 'create-tenant',
        impact: singleTenantMode
          ? 'Unavailable in single-tenant mode. Only the default tenant and the private dev-operator tenant are allowed.'
          : 'Creates a tenant with an owner account, then optionally seeds demo records.',
        label: 'Create tenant',
        section: 'tenant_factory',
        tone: 'neutral',
      },
      {
        action: 'reset-tenant',
        available: localDestructiveToolsEnabled,
        id: 'reset-selected-tenant',
        impact: localDestructiveToolsEnabled
          ? 'Clears and re-seeds the currently selected tenant.'
          : 'Available only in explicit local development mode.',
        label: 'Reset selected tenant',
        section: 'danger_zone',
        tone: 'danger',
        unavailableLabel: 'Unavailable',
      },
      {
        action: 'clear-tenant-data',
        available: localDestructiveToolsEnabled,
        id: 'clear-selected-tenant',
        impact: localDestructiveToolsEnabled
          ? 'Removes tenant business records without deleting the tenant itself.'
          : 'Available only in explicit local development mode.',
        label: 'Clear selected tenant',
        section: 'danger_zone',
        tone: 'danger',
        unavailableLabel: 'Unavailable',
      },
      {
        action: 'reset-database',
        available: localDestructiveToolsEnabled,
        id: 'reset-database',
        impact: localDestructiveToolsEnabled
          ? 'Stops local containers, rebuilds the local bootstrap, then restarts `pnpm dev` after a short delay.'
          : 'Available only in explicit local development mode.',
        label: 'Reset database',
        section: 'danger_zone',
        tone: 'danger',
        unavailableLabel: 'Unavailable',
      },
    ]
  }

  private buildPageContext(
    authSession: AuthResult,
    authorizationService: AuthorizationService,
    tenantSelection: TenantSelection,
    selectedMember: null | {
      email: string
      id: string
      isActive: boolean
      name: string
      role: 'admin' | 'member' | 'owner'
      userId: string
    }
  ): DevInspectorPageDto['context'] {
    const selectedTenantName =
      tenantSelection.selectedTenant?.organizationName ?? tenantSelection.selectedTenantOption.name

    return {
      accessMode: 'read_only',
      activeTenantId: tenantSelection.activeTenant.id,
      activeTenantName: tenantSelection.activeTenant.name,
      activeTenantSlug: tenantSelection.activeTenant.slug,
      currentRole: tenantSelection.currentMembership?.role ?? null,
      environment: 'development',
      isAnonymous: authSession.user.isAnonymous,
      operator: {
        email: authSession.user.email,
        membershipRole: tenantSelection.currentMembership?.role ?? null,
        name: authSession.user.name ?? authSession.user.email,
        publicId: authSession.user.publicId,
      },
      readOnlyBadge: 'Read-Only Access',
      scenario: {
        actorId: selectedMember?.userId ?? '',
        actorName: selectedMember?.name ?? selectedMember?.email ?? 'No member selected',
        actorRole: selectedMember?.role ?? null,
        tenantId: tenantSelection.selectedTenantId,
        tenantName: selectedTenantName,
        tenantSlug:
          tenantSelection.selectedTenant?.organizationSlug ??
          tenantSelection.selectedTenantOption.slug,
      },
      selectedMemberId: selectedMember?.id ?? '',
      selectedMemberName: selectedMember?.name ?? selectedMember?.email ?? 'No member selected',
      selectedMemberPermissions: this.buildSelectedMemberPermissions(
        authorizationService,
        tenantSelection.selectedTenantId,
        selectedMember
      ),
      selectedMemberRole: selectedMember?.role ?? null,
      selectedTenantId: tenantSelection.selectedTenantId,
      selectedTenantName,
      sessionTenant: {
        id: tenantSelection.activeTenant.id,
        name: tenantSelection.activeTenant.name,
        slug: tenantSelection.activeTenant.slug,
      },
      singleTenantMode: this.singleTenantMode,
      userEmail: authSession.user.email,
      userName: authSession.user.name ?? authSession.user.email,
      userPublicId: authSession.user.publicId,
    }
  }

  private buildRecentActions(
    audit: DevInspectorPageDto['audit']
  ): DevInspectorPageDto['recentActions'] {
    return audit.events.slice(0, 5).map((event) => ({
      action: event.action,
      id: event.id,
      result: event.result,
      timestamp: event.timestamp,
    }))
  }

  private buildSelectedMemberPermissions(
    authorizationService: AuthorizationService,
    selectedTenantId: string,
    selectedMember: null | {
      isActive: boolean
      role: 'admin' | 'member' | 'owner'
      userId: string
    }
  ): DevInspectorPageDto['context']['selectedMemberPermissions'] {
    const selectedMemberActor = {
      activeTenantId: selectedTenantId,
      isDevOperator: false,
      membershipIsActive: selectedMember?.isActive ?? false,
      membershipRole: selectedMember?.role ?? null,
      userId: selectedMember?.userId ?? null,
    }

    return {
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
    }
  }

  private buildView(filters: DevInspectorFilters): DevInspectorPageDto['view'] {
    return {
      activeTab: resolveActiveTab(filters.tab),
      auditSearch: filters.auditSearch?.trim() ?? '',
      memberRole: resolveMemberRole(filters.memberRole),
      memberSearch: filters.memberSearch?.trim() ?? '',
      memberStatus: resolveMemberStatus(filters.memberStatus),
      probeType: resolveProbeType(filters.probeType),
      selectedRecordId: filters.selectedRecordId?.trim() ?? '',
    }
  }

  private resolveSelectedMember(
    members: {
      email: string
      id: string
      isActive: boolean
      name: string
      role: 'admin' | 'member' | 'owner'
      userId: string
    }[],
    currentUserId: string,
    requestedMemberId?: string
  ): null | {
    email: string
    id: string
    isActive: boolean
    name: string
    role: 'admin' | 'member' | 'owner'
    userId: string
  } {
    return (
      members.find((member) => member.id === requestedMemberId) ??
      members.find((member) => member.userId === currentUserId) ??
      members[0] ??
      null
    )
  }

  private async resolveTenantSelection(
    inspectableTenants: DevInspectorPageDto['inspectableTenants'],
    memberships: DevInspectorMembershipDto[],
    activeTenantId: null | string | undefined,
    requestedTenantId?: string
  ): Promise<TenantSelection> {
    if (!activeTenantId) {
      throw new DomainError('Missing active tenant.', 'forbidden')
    }

    const currentMembership =
      memberships.find((membership) => membership.organizationId === activeTenantId) ?? null
    const activeTenant = inspectableTenants.find((tenant) => tenant.id === activeTenantId)

    if (!activeTenant) {
      throw new DomainError('Active tenant is not available.', 'forbidden')
    }

    const fallbackTenantId =
      inspectableTenants.find((tenant) => !tenant.isSessionTenant)?.id ?? activeTenantId
    const selectedTenantId =
      requestedTenantId && inspectableTenants.some((tenant) => tenant.id === requestedTenantId)
        ? requestedTenantId
        : fallbackTenantId
    const selectedTenantOption =
      inspectableTenants.find((tenant) => tenant.id === selectedTenantId) ?? activeTenant

    return {
      activeTenant,
      currentMembership,
      inspectableTenants,
      selectedTenant:
        memberships.find((membership) => membership.organizationId === selectedTenantId) ??
        currentMembership ??
        null,
      selectedTenantId,
      selectedTenantOption,
    }
  }
}
