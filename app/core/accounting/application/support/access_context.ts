import type { AuthResult } from '#core/user_management/domain/authentication'

export interface AccountingAccessContext {
  actorId: null | string
  isAnonymous: boolean
  requestId: string
  /** Active organization id — same as Better Auth `activeOrganizationId` (tenant). */
  tenantId: string
}

export function accountingAccessFromSession(
  session: AuthResult | undefined,
  requestId = 'unknown'
): AccountingAccessContext {
  const tenantId = session?.session.activeOrganizationId
  if (!tenantId) {
    throw new Error('Missing active organization — cannot build accounting access context.')
  }

  return {
    actorId: session.user.id,
    isAnonymous: session.user.isAnonymous,
    requestId,
    tenantId,
  }
}

/**
 * Build an access context with an explicit tenant id for system/seed use.
 * Prefer `accountingAccessFromSession` in HTTP paths.
 */
export function systemAccessContext(
  tenantId: string,
  requestId = 'system'
): AccountingAccessContext {
  return {
    actorId: null,
    isAnonymous: false,
    requestId,
    tenantId,
  }
}
