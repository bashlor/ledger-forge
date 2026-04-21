import { domainErrorToHttpStatus } from './domain_error_status.js'

export type DomainErrorTag =
  | 'already_exists'
  | 'business_logic_error'
  | 'forbidden'
  | 'invalid_data'
  | 'not_found'
  | 'unauthorized_user_operation'
  | 'unknown'
  | 'unspecified_internal_error'

export class DomainError extends Error {
  static readonly tagToHttpStatus = domainErrorToHttpStatus
  cause?: unknown
  exposeCause: boolean
  status: number

  type: DomainErrorTag

  constructor(
    message: string,
    tag: DomainErrorTag = 'unknown',
    name?: string,
    cause?: unknown,
    exposeCause = false
  ) {
    super(message)
    this.name = name || 'DomainError'
    this.cause = cause
    this.type = tag
    this.exposeCause = exposeCause
    this.status = domainErrorToHttpStatus(tag)
    Object.setPrototypeOf(this, new.target.prototype)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, new.target.prototype.constructor)
    }
  }
}
