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

interface TenantSelection {
  activeTenant: { id: string; name: string; slug: string }
  currentMembership: DevInspectorMembershipDto | null
  selectedTenant: DevInspectorMembershipDto | null
  selectedTenantId: string
  tenantIds: string[]
}

export class DevOperatorConsolePageService {
  constructor(private readonly queryService: DevOperatorConsoleQueryService) {}

  async getPageData(
    authSession: AuthResult,
    authorizationService: AuthorizationService,
    filters: DevInspectorFilters = {}
  ): Promise<DevInspectorPageDto> {
    const memberships = await this.queryService.listMemberships(authSession, authorizationService)
    const tenantSelection = await this.resolveTenantSelection(
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
      tenantSelection.tenantIds,
      tenantSelection.selectedTenantId
    )

    const [audit, customers, expenses, invoices, metrics] = await Promise.all([
      this.queryService.listAuditTrail({
        accessibleTenantIds: tenantSelection.tenantIds,
        activeTenantId: tenantSelection.activeTenant.id,
        filters: auditFilters,
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
      globalOperations: this.buildGlobalOperations(),
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

  private buildGlobalOperations(): DevInspectorPageDto['globalOperations'] {
    return [
      {
        action: null,
        available: false,
        id: 'create-empty-tenant',
        impact: 'Creates a blank tenant shell for isolated scenario setup.',
        label: 'Create empty tenant',
        section: 'tenant_factory',
        tone: 'neutral',
      },
      {
        action: 'create-tenant-scenario',
        available: true,
        id: 'create-full-tenant',
        impact: 'Creates a tenant with owner, admin, active member, and inactive member.',
        label: 'Create full tenant',
        section: 'tenant_factory',
        tone: 'neutral',
      },
      {
        action: 'create-tenant-scenario-seeded',
        available: true,
        id: 'create-seeded-tenant',
        impact: 'Creates a tenant and seeds records for a realistic end-to-end scenario.',
        label: 'Create seeded tenant',
        section: 'tenant_factory',
        tone: 'neutral',
      },
      {
        action: 'reset-local-dataset',
        available: true,
        id: 'reset-selected-tenant',
        impact: 'Clears and re-seeds the currently selected tenant.',
        label: 'Reset selected tenant',
        section: 'danger_zone',
        tone: 'danger',
      },
      {
        action: 'clear-tenant-data',
        available: true,
        id: 'clear-selected-tenant',
        impact: 'Removes tenant business records without deleting the tenant itself.',
        label: 'Clear selected tenant',
        section: 'danger_zone',
        tone: 'danger',
      },
      {
        action: null,
        available: false,
        id: 'reset-database',
        impact: 'Reserved for a full local reset. Intentionally gated in this slice.',
        label: 'Reset database',
        section: 'danger_zone',
        tone: 'danger',
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
      tenantSelection.selectedTenant?.organizationName ?? tenantSelection.activeTenant.name

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
          tenantSelection.selectedTenant?.organizationSlug ?? tenantSelection.activeTenant.slug,
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
    memberships: DevInspectorMembershipDto[],
    activeTenantId: null | string | undefined,
    requestedTenantId?: string
  ): Promise<TenantSelection> {
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
      : {
          id: activeTenantId,
          name: activeTenantId,
          slug: activeTenantId,
        }

    const tenantIds = memberships.map((membership) => membership.organizationId)
    const selectedTenantId =
      requestedTenantId && tenantIds.includes(requestedTenantId)
        ? requestedTenantId
        : activeTenantId

    return {
      activeTenant,
      currentMembership,
      selectedTenant:
        memberships.find((membership) => membership.organizationId === selectedTenantId) ??
        currentMembership ??
        null,
      selectedTenantId,
      tenantIds,
    }
  }
}
