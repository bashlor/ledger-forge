import { DomainError } from '#core/common/errors/domain_error'

export class AuthenticationError extends DomainError {
  constructor(message: string = 'Authentication provider error') {
    super(message, 'unspecified_internal_error', 'AuthenticationError')
  }

  static linkingFailed(reason?: string): AuthenticationError {
    return new AuthenticationError(
      reason
        ? `Failed to link authentication: ${reason}`
        : 'Failed to link to authentication provider'
    )
  }
}

export class EmailNotVerifiedError extends DomainError {
  constructor() {
    super('Email address has not been verified', 'forbidden', 'EmailNotVerifiedError')
  }
}

export class InvalidCredentialsError extends DomainError {
  constructor() {
    super('Invalid email or password.', 'invalid_data', 'InvalidCredentialsError')
  }
}

export class SessionExpiredError extends DomainError {
  constructor() {
    super('Session has expired or is invalid', 'unauthorized_user_operation', 'SessionExpiredError')
  }
}

export class UserAlreadyExistsError extends DomainError {
  constructor() {
    super('A user with this email already exists', 'already_exists', 'UserAlreadyExistsError')
  }
}

export class UserNotFoundError extends DomainError {
  constructor() {
    super('User not found', 'not_found', 'UserNotFoundError')
  }
}
