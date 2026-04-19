export interface BetterAuthErrorEntry {
  status: number
  userMessage: string
}

export type PublicErrorKey =
  | 'E_CHANGE_PASSWORD'
  | 'E_RESET_PASSWORD'
  | 'E_SIGNUP_ERROR'
  | 'E_UPDATE_PROFILE'

export interface PublicErrorOptions {
  errorKey?: PublicErrorKey
  exposeInternalMessage?: boolean
  statusOverride?: number
}

export interface ResolvedPublicError {
  code: string
  fieldBag?: Record<string, string>
  message: string
  presentation: 'form' | 'notification' | 'status_page'
  status: number
}

export interface StaticPublicErrorMapping {
  code: string
  fieldBag?: Record<string, string>
  message: string
}
