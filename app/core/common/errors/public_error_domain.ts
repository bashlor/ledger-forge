import type { ResolvedPublicError } from './public_error_contract.js'

import { domainErrorToHttpStatus } from './domain_error_status.js'

const GENERIC_BUSINESS_ERROR_MESSAGE = 'The requested action could not be completed.'
const GENERIC_ERROR_MESSAGE = 'An unexpected error occurred.'

export function domainErrorPresentation(tag: string): ResolvedPublicError['presentation'] {
  return tag === 'not_found' ? 'status_page' : 'notification'
}

export { domainErrorToHttpStatus }

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
