import type { AuthResult } from '#core/user_management/domain/authentication'

export interface AccountingAccessContext {
  actorId: null | string
  isAnonymous: boolean
  requestId: string
}

export const SYSTEM_ACCOUNTING_ACCESS_CONTEXT: AccountingAccessContext = {
  actorId: null,
  isAnonymous: false,
  requestId: 'system',
}

export function accountingAccessFromSession(
  session: AuthResult | undefined,
  requestId = 'unknown'
): AccountingAccessContext {
  if (!session) {
    return { ...SYSTEM_ACCOUNTING_ACCESS_CONTEXT, requestId }
  }

  return {
    actorId: session.user.id,
    isAnonymous: session.user.isAnonymous,
    requestId,
  }
}
