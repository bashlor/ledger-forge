import type * as schema from '#core/common/drizzle/index'
import type { AuthResult } from '#core/user_management/domain/authentication'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { DomainError } from '#core/common/errors/domain_error'
import { type DevOperatorConsoleQueryService } from '#core/dev_tools/application/dev_operator_console_query_service'
import { type AuthorizationService } from '#core/user_management/application/authorization_service'
import { setActiveOrganizationForSession } from '#core/user_management/application/workspace_provisioning'

export interface DevOperatorScenarioContext {
  access: {
    actorId: string
    isAnonymous: false
    requestId: string
    tenantId: string
  }
  actor: Awaited<ReturnType<AuthorizationService['actorFromSession']>>
  actorUserId: string
  selectedMember: DevOperatorScenarioMember | null
  tenantId: string
}

export interface DevOperatorScenarioMember {
  email: string
  id: string
  isActive: boolean
  name: string
  role: 'admin' | 'member' | 'owner'
  userId: string
}

export class DevOperatorConsoleScenarioService {
  constructor(
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly queryService: DevOperatorConsoleQueryService
  ) {}

  async resolveScenario(
    authSession: AuthResult,
    requestedTenantId?: string,
    requestedMemberId?: string
  ): Promise<DevOperatorScenarioContext> {
    const inspectableTenants = await this.queryService.listInspectableTenants(authSession)
    const requestedTenant = requestedTenantId?.trim() || ''
    const tenantId = requestedTenant || authSession.session.activeOrganizationId

    if (!tenantId) {
      throw new DomainError('Missing active tenant.', 'forbidden')
    }

    if (!inspectableTenants.some((tenant) => tenant.id === tenantId)) {
      throw new DomainError('Selected tenant is not available for this dev operator.', 'forbidden')
    }

    const requestedMember = requestedMemberId?.trim() || ''
    const members = await this.queryService.listMembersForTenant(tenantId, requestedMember)
    if (requestedMember && !members.some((member) => member.id === requestedMember)) {
      throw new DomainError(
        'Selected scenario member does not belong to the selected tenant.',
        'invalid_data'
      )
    }

    const selectedMember =
      members.find((member) => member.id === requestedMember) ??
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

  async switchActiveTenant(
    authSession: AuthResult,
    sessionToken: string,
    tenantId: string
  ): Promise<void> {
    if (tenantId !== authSession.session.activeOrganizationId) {
      throw new DomainError(
        'Dev operator session tenant stays pinned to its dedicated workspace.',
        'forbidden'
      )
    }

    await setActiveOrganizationForSession(this.db, sessionToken, tenantId, {
      userId: authSession.user.id,
    })
  }
}
