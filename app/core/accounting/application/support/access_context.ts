import type { AuthResult } from '#core/user_management/domain/authentication'

export interface AccountingAccessContext {
  actorId: null | string
  isAnonymous: boolean
}

export const SYSTEM_ACCOUNTING_ACCESS_CONTEXT: AccountingAccessContext = {
  actorId: null,
  isAnonymous: false,
}

export function accountingAccessFromSession(session?: AuthResult): AccountingAccessContext {
  if (!session) {
    return SYSTEM_ACCOUNTING_ACCESS_CONTEXT
  }

  return {
    actorId: session.user.id,
    isAnonymous: session.user.isAnonymous,
  }
}
