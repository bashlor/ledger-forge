import type { ResolvedPublicError } from './public_error_contract.js'

export function formPublicError(
  code: string,
  message: string,
  status: number,
  fieldBag?: Record<string, string>
): ResolvedPublicError {
  return publicError(code, message, status, fieldBag, 'form')
}

export function publicError(
  code: string,
  message: string,
  status: number,
  fieldBag: Record<string, string> | undefined,
  presentation: ResolvedPublicError['presentation']
): ResolvedPublicError {
  return {
    code,
    message,
    presentation,
    status,
    ...(fieldBag ? { fieldBag } : {}),
  }
}
