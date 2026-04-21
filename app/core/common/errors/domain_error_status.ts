import type { DomainErrorTag } from './domain_error.js'

const DOMAIN_TAG_TO_HTTP: Record<DomainErrorTag, number> = {
  already_exists: 409,
  business_logic_error: 422,
  forbidden: 403,
  invalid_data: 422,
  not_found: 404,
  unauthorized_user_operation: 401,
  unknown: 500,
  unspecified_internal_error: 500,
}

export function domainErrorToHttpStatus(tag: string): number {
  return DOMAIN_TAG_TO_HTTP[tag as DomainErrorTag] ?? 500
}

export function resolveHttpErrorStatus(error: unknown): number {
  const status =
    typeof error === 'object' && error !== null && 'status' in error
      ? (error as { status?: number }).status
      : undefined

  return typeof status === 'number' && Number.isFinite(status) ? status : 500
}
