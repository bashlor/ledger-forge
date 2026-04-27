import { DomainError } from '#core/common/errors/domain_error'
import {
  AuthenticationError,
  EmailNotVerifiedError,
  InvalidCredentialsError,
  SessionExpiredError,
  UserAlreadyExistsError,
  UserNotFoundError,
} from '#core/user_management/domain/errors'

import type {
  BetterAuthErrorEntry,
  PublicErrorKey,
  PublicErrorOptions,
  ResolvedPublicError,
} from './public_error_contract.js'

import { formPublicError } from './public_error_helpers.js'

const GENERIC_AUTH_ERROR_MESSAGE = 'An unexpected authentication error occurred. Please try again.'
const GENERIC_BUSINESS_RULE_MESSAGE = 'The requested action could not be completed.'
const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password.'
const SESSION_EXPIRED_MESSAGE = 'Session has expired or is invalid'
const USER_ALREADY_EXISTS_MESSAGE = 'These credentials are not accepted for sign-up.'
const EMAIL_NOT_VERIFIED_MESSAGE = 'Email address has not been verified'
const USER_NOT_FOUND_MESSAGE = 'User not found'
const INVALID_TOKEN_MESSAGE = 'The link has expired or is invalid.'

const BETTER_AUTH_ERROR_MAP: Record<string, BetterAuthErrorEntry> = {
  _default: {
    status: 500,
    userMessage: 'An unexpected error occurred. Please try again.',
  },
  CREDENTIAL_ACCOUNT_NOT_FOUND: {
    status: 401,
    userMessage: INVALID_CREDENTIALS_MESSAGE,
  },
  EMAIL_NOT_VERIFIED: {
    status: 403,
    userMessage: 'Please verify your email address before signing in.',
  },
  EMAIL_VERIFICATION_REQUIRED_BEFORE_ACCEPTING_OR_REJECTING_INVITATION: {
    status: 422,
    userMessage: 'You must verify your email address before responding to this invitation.',
  },
  FAILED_TO_CREATE_USER: {
    status: 500,
    userMessage: 'Unable to create account. Please try again.',
  },
  FAILED_TO_RETRIEVE_INVITATION: {
    status: 422,
    userMessage: 'The invitation could not be processed. Please try again.',
  },
  INVALID_EMAIL: {
    status: 422,
    userMessage: 'The email address is invalid.',
  },
  INVALID_EMAIL_OR_PASSWORD: {
    status: 401,
    userMessage: INVALID_CREDENTIALS_MESSAGE,
  },
  INVALID_PASSWORD: {
    status: 422,
    userMessage: 'The password does not meet the requirements.',
  },
  INVALID_TOKEN: {
    status: 401,
    userMessage: INVALID_TOKEN_MESSAGE,
  },
  INVITATION_NOT_FOUND: {
    status: 422,
    userMessage: 'The invitation is invalid or no longer available.',
  },
  INVITER_IS_NO_LONGER_A_MEMBER_OF_THE_ORGANIZATION: {
    status: 404,
    userMessage: 'The inviter is no longer a member of this organization.',
  },
  MEMBER_NOT_FOUND: {
    status: 404,
    userMessage: 'The organization member could not be found.',
  },
  NO_ACTIVE_ORGANIZATION: {
    status: 403,
    userMessage: 'No active organization is selected for this session.',
  },
  ORGANIZATION_ALREADY_EXISTS: {
    status: 409,
    userMessage: 'An organization with these details already exists.',
  },
  ORGANIZATION_MEMBERSHIP_LIMIT_REACHED: {
    status: 422,
    userMessage: GENERIC_BUSINESS_RULE_MESSAGE,
  },
  ORGANIZATION_NOT_FOUND: {
    status: 404,
    userMessage: 'The organization could not be found.',
  },
  ORGANIZATION_SLUG_ALREADY_TAKEN: {
    status: 409,
    userMessage: 'This organization slug is already taken.',
  },
  PASSWORD_TOO_LONG: {
    status: 422,
    userMessage: 'The password exceeds the maximum allowed length.',
  },
  PASSWORD_TOO_SHORT: {
    status: 422,
    userMessage: 'The password is too short.',
  },
  SESSION_EXPIRED: {
    status: 401,
    userMessage: 'Your session has expired. Please sign in again.',
  },
  USER_ALREADY_EXISTS: {
    status: 409,
    userMessage: USER_ALREADY_EXISTS_MESSAGE,
  },
  /** Sign-up email collision (Better Auth base route uses this code, not `USER_ALREADY_EXISTS`). */
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: {
    status: 409,
    userMessage: USER_ALREADY_EXISTS_MESSAGE,
  },
  USER_IS_ALREADY_A_MEMBER_OF_THIS_ORGANIZATION: {
    status: 409,
    userMessage: 'This user is already a member of the organization.',
  },
  USER_IS_ALREADY_INVITED_TO_THIS_ORGANIZATION: {
    status: 409,
    userMessage: 'This user already has a pending invitation for the organization.',
  },
  USER_IS_NOT_A_MEMBER_OF_THE_ORGANIZATION: {
    status: 403,
    userMessage: 'You are not a member of this organization.',
  },
  USER_NOT_FOUND: {
    status: 404,
    userMessage: 'No account found with this email.',
  },
  YOU_ARE_NOT_A_MEMBER_OF_THIS_ORGANIZATION: {
    status: 403,
    userMessage: 'You are not a member of this organization.',
  },
  YOU_ARE_NOT_ALLOWED_TO_ACCESS_THIS_ORGANIZATION: {
    status: 403,
    userMessage: 'You are not allowed to access this organization.',
  },
  YOU_ARE_NOT_ALLOWED_TO_CANCEL_THIS_INVITATION: {
    status: 403,
    userMessage: 'You are not allowed to cancel this invitation.',
  },
  YOU_ARE_NOT_ALLOWED_TO_CREATE_A_NEW_ORGANIZATION: {
    status: 403,
    userMessage: 'You are not allowed to create a new organization.',
  },
  YOU_ARE_NOT_ALLOWED_TO_DELETE_THIS_MEMBER: {
    status: 403,
    userMessage: 'You are not allowed to remove this member.',
  },
  YOU_ARE_NOT_ALLOWED_TO_DELETE_THIS_ORGANIZATION: {
    status: 403,
    userMessage: 'You are not allowed to delete this organization.',
  },
  YOU_ARE_NOT_ALLOWED_TO_INVITE_USER_WITH_THIS_ROLE: {
    status: 403,
    userMessage: 'You are not allowed to invite a user with this role.',
  },
  YOU_ARE_NOT_ALLOWED_TO_INVITE_USERS_TO_THIS_ORGANIZATION: {
    status: 403,
    userMessage: 'You are not allowed to invite users to this organization.',
  },
  YOU_ARE_NOT_ALLOWED_TO_UPDATE_THIS_MEMBER: {
    status: 403,
    userMessage: 'You are not allowed to update this member.',
  },
  YOU_ARE_NOT_ALLOWED_TO_UPDATE_THIS_ORGANIZATION: {
    status: 403,
    userMessage: 'You are not allowed to update this organization.',
  },
  YOU_ARE_NOT_THE_RECIPIENT_OF_THE_INVITATION: {
    status: 403,
    userMessage: 'You are not the recipient of this invitation.',
  },
  YOU_CANNOT_LEAVE_THE_ORGANIZATION_AS_THE_ONLY_OWNER: {
    status: 422,
    userMessage: GENERIC_BUSINESS_RULE_MESSAGE,
  },
  YOU_CANNOT_LEAVE_THE_ORGANIZATION_WITHOUT_AN_OWNER: {
    status: 422,
    userMessage: GENERIC_BUSINESS_RULE_MESSAGE,
  },
}

export function lookupBetterAuthError(code: string | undefined): BetterAuthErrorEntry {
  return BETTER_AUTH_ERROR_MAP[code ?? ''] ?? BETTER_AUTH_ERROR_MAP['_default']
}

export function resolveAuthPublicError(
  error: unknown,
  options?: PublicErrorOptions
): null | ResolvedPublicError {
  if (error instanceof InvalidCredentialsError) {
    return formPublicError('auth.invalid_credentials', INVALID_CREDENTIALS_MESSAGE, 401, {
      password: INVALID_CREDENTIALS_MESSAGE,
    })
  }

  if (error instanceof UserAlreadyExistsError) {
    return formPublicError('auth.user_already_exists', USER_ALREADY_EXISTS_MESSAGE, 409, {
      email: USER_ALREADY_EXISTS_MESSAGE,
    })
  }

  if (error instanceof EmailNotVerifiedError) {
    return formPublicError('auth.email_not_verified', EMAIL_NOT_VERIFIED_MESSAGE, 403, {
      email: EMAIL_NOT_VERIFIED_MESSAGE,
    })
  }

  if (error instanceof UserNotFoundError) {
    return formPublicError('auth.user_not_found', USER_NOT_FOUND_MESSAGE, 404, {
      email: USER_NOT_FOUND_MESSAGE,
    })
  }

  if (error instanceof SessionExpiredError) {
    return formPublicError(
      'auth.session_expired',
      SESSION_EXPIRED_MESSAGE,
      401,
      options?.errorKey === 'E_CHANGE_PASSWORD'
        ? { currentPassword: SESSION_EXPIRED_MESSAGE }
        : { password: SESSION_EXPIRED_MESSAGE }
    )
  }

  if (error instanceof AuthenticationError) {
    return formPublicError(
      'auth.provider_failure',
      GENERIC_AUTH_ERROR_MESSAGE,
      options?.statusOverride ?? 500,
      authFieldBagForKey(options?.errorKey, GENERIC_AUTH_ERROR_MESSAGE)
    )
  }

  if (!(error instanceof DomainError)) {
    return null
  }

  if (error.name === 'InvalidAuthPayloadError') {
    const message = resolveAuthPayloadPublicMessage(error.message)
    return formPublicError('auth.invalid_payload', message, 422, authPayloadFieldBag(message))
  }

  if (error.name === 'OrganizationLookupError') {
    return formPublicError('auth.resource_not_found', error.message, 404)
  }

  if (error.name === 'OrganizationConflictError') {
    return formPublicError('auth.conflict', error.message, 409)
  }

  if (error.name === 'OrganizationAuthorizationError') {
    return formPublicError('auth.forbidden', error.message, 403)
  }

  if (error.name === 'OrganizationBusinessRuleError') {
    return formPublicError('domain.business_logic_error', GENERIC_BUSINESS_RULE_MESSAGE, 422)
  }

  if (error.type === 'unauthorized_user_operation' && error.message === SESSION_EXPIRED_MESSAGE) {
    return formPublicError(
      'auth.session_expired',
      SESSION_EXPIRED_MESSAGE,
      401,
      authFieldBagForKey(options?.errorKey, SESSION_EXPIRED_MESSAGE)
    )
  }

  if (
    (error.name === 'InvalidTokenError' && error.message === INVALID_TOKEN_MESSAGE) ||
    (error.type === 'unauthorized_user_operation' && error.message === INVALID_TOKEN_MESSAGE)
  ) {
    return formPublicError(
      'auth.invalid_token',
      INVALID_TOKEN_MESSAGE,
      401,
      options?.errorKey === 'E_RESET_PASSWORD'
        ? { newPassword: INVALID_TOKEN_MESSAGE }
        : { password: INVALID_TOKEN_MESSAGE }
    )
  }

  if (error.name === 'InvalidTokenError') {
    return formPublicError(
      'auth.session_expired',
      error.message,
      401,
      authFieldBagForKey(options?.errorKey, error.message)
    )
  }

  return null
}

export function resolveBetterAuthPublicError(code: string | undefined): ResolvedPublicError {
  const entry = lookupBetterAuthError(code)

  switch (code) {
    case 'CREDENTIAL_ACCOUNT_NOT_FOUND':
    case 'INVALID_EMAIL_OR_PASSWORD':
      return formPublicError('auth.invalid_credentials', entry.userMessage, entry.status)
    case 'EMAIL_NOT_VERIFIED':
      return formPublicError('auth.email_not_verified', entry.userMessage, entry.status)
    case 'EMAIL_VERIFICATION_REQUIRED_BEFORE_ACCEPTING_OR_REJECTING_INVITATION':
    case 'FAILED_TO_RETRIEVE_INVITATION':
    case 'INVALID_EMAIL':
    case 'INVALID_PASSWORD':
    case 'INVITATION_NOT_FOUND':
    case 'PASSWORD_TOO_LONG':
    case 'PASSWORD_TOO_SHORT':
      return formPublicError('auth.invalid_payload', entry.userMessage, entry.status)
    case 'FAILED_TO_CREATE_USER':
      return formPublicError('auth.signup_failed', entry.userMessage, entry.status)
    case 'INVALID_TOKEN':
      return formPublicError('auth.invalid_token', entry.userMessage, entry.status)
    case 'INVITER_IS_NO_LONGER_A_MEMBER_OF_THE_ORGANIZATION':
    case 'MEMBER_NOT_FOUND':
    case 'ORGANIZATION_NOT_FOUND':
      return formPublicError('auth.resource_not_found', entry.userMessage, entry.status)
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
      return formPublicError('auth.forbidden', entry.userMessage, entry.status)
    case 'ORGANIZATION_ALREADY_EXISTS':
    case 'ORGANIZATION_SLUG_ALREADY_TAKEN':
    case 'USER_IS_ALREADY_A_MEMBER_OF_THIS_ORGANIZATION':
    case 'USER_IS_ALREADY_INVITED_TO_THIS_ORGANIZATION':
      return formPublicError('auth.conflict', entry.userMessage, entry.status)
    case 'ORGANIZATION_MEMBERSHIP_LIMIT_REACHED':
      return formPublicError('domain.business_logic_error', GENERIC_BUSINESS_RULE_MESSAGE, 422)
    case 'SESSION_EXPIRED':
      return formPublicError('auth.session_expired', entry.userMessage, entry.status)
    case 'USER_ALREADY_EXISTS':
    case 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL':
      return formPublicError('auth.user_already_exists', entry.userMessage, entry.status)
    case 'USER_NOT_FOUND':
      return formPublicError('auth.user_not_found', entry.userMessage, entry.status)
    case 'YOU_CANNOT_LEAVE_THE_ORGANIZATION_AS_THE_ONLY_OWNER':
    case 'YOU_CANNOT_LEAVE_THE_ORGANIZATION_WITHOUT_AN_OWNER':
      return formPublicError('domain.business_logic_error', GENERIC_BUSINESS_RULE_MESSAGE, 422)
    default:
      return formPublicError('auth.provider_failure', entry.userMessage, entry.status)
  }
}

function authFieldBagForKey(
  errorKey: PublicErrorKey | undefined,
  message: string
): Record<string, string> {
  switch (errorKey) {
    case 'E_CHANGE_PASSWORD':
      return { currentPassword: message }
    case 'E_RESET_PASSWORD':
      return { newPassword: message, token: message }
    case 'E_SIGNUP_ERROR':
      return { email: message, password: message }
    case 'E_UPDATE_PROFILE':
      return { name: message }
    default:
      return { password: message }
  }
}

function authPayloadFieldBag(message: string): Record<string, string> {
  return message.toLowerCase().includes('email') ? { email: message } : { password: message }
}

function resolveAuthPayloadPublicMessage(message: string): string {
  switch (message) {
    case 'The email address is invalid.':
    case 'The password does not meet the requirements.':
    case 'The password exceeds the maximum allowed length.':
    case 'The password is too short.':
      return message
    default:
      return 'The submitted credentials are invalid.'
  }
}
