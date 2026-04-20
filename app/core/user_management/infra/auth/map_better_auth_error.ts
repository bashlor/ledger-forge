import { DomainError } from '#core/common/errors/domain_error'
import { lookupBetterAuthError } from '#core/common/errors/public_error'

import {
  AuthenticationError,
  EmailNotVerifiedError,
  InvalidCredentialsError,
  UserAlreadyExistsError,
  UserNotFoundError,
} from '../../domain/errors.js'

export function mapBetterAuthError(error: unknown): Error {
  if (error instanceof DomainError) {
    return error
  }

  const code = extractBetterAuthCode(error)
  const entry = lookupBetterAuthError(code)

  switch (code) {
    case 'CREDENTIAL_ACCOUNT_NOT_FOUND':
    case 'INVALID_EMAIL_OR_PASSWORD':
      return new InvalidCredentialsError()
    case 'EMAIL_NOT_VERIFIED':
      return new EmailNotVerifiedError()
    case 'EMAIL_VERIFICATION_REQUIRED_BEFORE_ACCEPTING_OR_REJECTING_INVITATION':
    case 'FAILED_TO_RETRIEVE_INVITATION':
    case 'INVALID_EMAIL':
    case 'INVALID_PASSWORD':
    case 'INVITATION_NOT_FOUND':
    case 'PASSWORD_TOO_LONG':
    case 'PASSWORD_TOO_SHORT':
      return new DomainError(entry.userMessage, 'invalid_data', 'InvalidAuthPayloadError')
    case 'INVALID_TOKEN':
    case 'SESSION_EXPIRED':
      return new DomainError(entry.userMessage, 'unauthorized_user_operation', 'InvalidTokenError')
    case 'INVITER_IS_NO_LONGER_A_MEMBER_OF_THE_ORGANIZATION':
    case 'MEMBER_NOT_FOUND':
    case 'ORGANIZATION_NOT_FOUND':
      return new DomainError(entry.userMessage, 'not_found', 'OrganizationLookupError')
    case 'NO_ACTIVE_ORGANIZATION':
    case 'USER_IS_NOT_A_MEMBER_OF_THE_ORGANIZATION':
    case 'YOU_ARE_NOT_A_MEMBER_OF_THIS_ORGANIZATION':
    case 'YOU_ARE_NOT_ALLOWED_TO_ACCESS_THIS_ORGANIZATION':
    case 'YOU_ARE_NOT_ALLOWED_TO_CANCEL_THIS_INVITATION':
    case 'YOU_ARE_NOT_ALLOWED_TO_CREATE_A_NEW_ORGANIZATION':
    case 'YOU_ARE_NOT_ALLOWED_TO_DELETE_THIS_MEMBER':
    case 'YOU_ARE_NOT_ALLOWED_TO_DELETE_THIS_ORGANIZATION':
    case 'YOU_ARE_NOT_ALLOWED_TO_INVITE_USER_WITH_THIS_ROLE':
    case 'YOU_ARE_NOT_ALLOWED_TO_INVITE_USERS_TO_THIS_ORGANIZATION':
    case 'YOU_ARE_NOT_ALLOWED_TO_UPDATE_THIS_MEMBER':
    case 'YOU_ARE_NOT_ALLOWED_TO_UPDATE_THIS_ORGANIZATION':
    case 'YOU_ARE_NOT_THE_RECIPIENT_OF_THE_INVITATION':
      return new DomainError(entry.userMessage, 'forbidden', 'OrganizationAuthorizationError')
    case 'ORGANIZATION_ALREADY_EXISTS':
    case 'ORGANIZATION_SLUG_ALREADY_TAKEN':
    case 'USER_IS_ALREADY_A_MEMBER_OF_THIS_ORGANIZATION':
    case 'USER_IS_ALREADY_INVITED_TO_THIS_ORGANIZATION':
      return new DomainError(entry.userMessage, 'already_exists', 'OrganizationConflictError')
    case 'ORGANIZATION_MEMBERSHIP_LIMIT_REACHED':
    case 'YOU_CANNOT_LEAVE_THE_ORGANIZATION_AS_THE_ONLY_OWNER':
    case 'YOU_CANNOT_LEAVE_THE_ORGANIZATION_WITHOUT_AN_OWNER':
      return new DomainError(
        entry.userMessage,
        'business_logic_error',
        'OrganizationBusinessRuleError'
      )
    case 'USER_ALREADY_EXISTS':
      return new UserAlreadyExistsError()
    case 'USER_NOT_FOUND':
      return new UserNotFoundError()
    default:
      return new AuthenticationError()
  }
}

function extractBetterAuthCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') {
    return undefined
  }

  const candidate = error as Record<string, unknown>
  if (candidate.body && typeof candidate.body === 'object') {
    const nestedCode = (candidate.body as Record<string, unknown>).code
    if (typeof nestedCode === 'string') {
      return nestedCode
    }
  }

  return typeof candidate.code === 'string' ? candidate.code : undefined
}
