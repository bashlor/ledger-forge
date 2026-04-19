import type { ResolvedPublicError } from './public_error_contract.js'

type DomainErrorTag =
  | 'already_exists'
  | 'business_logic_error'
  | 'forbidden'
  | 'invalid_data'
  | 'not_found'
  | 'unauthorized_user_operation'
  | 'unknown'
  | 'unspecified_internal_error'

const GENERIC_BUSINESS_ERROR_MESSAGE = 'The requested action could not be completed.'
const GENERIC_ERROR_MESSAGE = 'An unexpected error occurred.'

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

export function domainErrorPresentation(tag: string): ResolvedPublicError['presentation'] {
  return tag === 'not_found' ? 'status_page' : 'notification'
}

export function domainErrorToHttpStatus(tag: string): number {
  return DOMAIN_TAG_TO_HTTP[tag as DomainErrorTag] ?? 500
}

export function genericDomainMessage(tag: string): string {
  switch (tag) {
    case 'already_exists':
      return 'The resource already exists.'
    case 'business_logic_error':
      return GENERIC_BUSINESS_ERROR_MESSAGE
    case 'forbidden':
      return 'You are not allowed to perform this action.'
    case 'invalid_data':
      return 'Some submitted data is invalid.'
    case 'not_found':
      return 'The requested resource was not found.'
    case 'unauthorized_user_operation':
      return 'You are not authorized to perform this action.'
    default:
      return GENERIC_ERROR_MESSAGE
  }
}
