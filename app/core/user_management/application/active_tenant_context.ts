import type { AuthorizationActor } from '#core/user_management/authorization/authorizer'
import type { AuthResult } from '#core/user_management/domain/authentication'

import { DomainError } from '#core/common/errors/domain_error'

import { AuthorizationDeniedError, type AuthorizationService } from './authorization_service.js'

export interface ActiveTenantContext {
  actor: AuthorizationActor
  authSession: AuthResult
  tenantId: string
  userId: string
}

export class ActiveTenantMembershipRequiredError extends AuthorizationDeniedError {
  constructor() {
    super('Active workspace membership is required for this request.')
    this.name = 'ActiveTenantMembershipRequiredError'
  }
}

export class ActiveTenantRequiredError extends DomainError {
  constructor() {
    super(
      'An active workspace is required for this request.',
      'unauthorized_user_operation',
      'ActiveTenantRequiredError'
    )
  }
}

export function requireActiveTenantContext(
  authSession: AuthResult | null | undefined,
  actor: AuthorizationActor
): ActiveTenantContext {
  const tenantId = authSession?.session.activeOrganizationId ?? null
  const userId = authSession?.user.id ?? null

  if (!authSession || !tenantId || !userId) {
    throw new ActiveTenantRequiredError()
  }

  if (
    actor.activeTenantId !== tenantId ||
    actor.userId !== userId ||
    !actor.membershipIsActive ||
    !actor.membershipRole
  ) {
    throw new ActiveTenantMembershipRequiredError()
  }

  return {
    actor,
    authSession,
    tenantId,
    userId,
  }
}

export async function resolveActiveTenantContext(
  authSession: AuthResult | null | undefined,
  authorizationService: AuthorizationService
): Promise<ActiveTenantContext> {
  const actor = await authorizationService.actorFromSession(authSession)
  return requireActiveTenantContext(authSession, actor)
}
