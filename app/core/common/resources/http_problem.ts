type DomainErrorTag =
  | 'already_exists'
  | 'business_logic_error'
  | 'forbidden'
  | 'invalid_data'
  | 'not_found'
  | 'unauthorized_user_operation'
  | 'unknown'
  | 'unspecified_internal_error'

// =============================================================================
// Domain error tag → HTTP status mapping
// =============================================================================

/**
 * RFC 7807 — Problem Details for HTTP APIs.
 *
 * A lightweight value-object that carries a structured error payload.
 * Call `.toResponse(response)` to write it to an AdonisJS response, or
 * `.toJSON()` to embed it in any serialisable context.
 */
export class HttpProblem {
  constructor(
    readonly status: number,
    readonly title: string,
    readonly detail?: string,
    readonly type: string = 'about:blank',
    readonly instance?: string,
    readonly extensions: Record<string, unknown> = {}
  ) {}

  // ---------------------------------------------------------------------------
  // Factory helpers
  // ---------------------------------------------------------------------------

  /**
   * Build a Problem Details from a Better Auth error code.
   */
  static fromBetterAuthCode(code: string | undefined, detail?: string): HttpProblem {
    const entry = BETTER_AUTH_ERROR_MAP[code ?? ''] ?? BETTER_AUTH_ERROR_MAP['_default']
    return new HttpProblem(
      entry.status,
      HTTP_STATUS_TITLES[entry.status] ?? 'Error',
      detail ?? entry.userMessage,
      `urn:neurotech:better-auth:${code ?? 'unknown'}`
    )
  }

  /**
   * Build a Problem Details from a DomainError-like object.
   * Accepts any object whose `.type` is a known domain-error tag.
   */
  static fromDomainError(error: { message: string; type: string }): HttpProblem {
    const status = DOMAIN_TAG_TO_HTTP[error.type as DomainErrorTag] ?? 500
    return new HttpProblem(
      status,
      HTTP_STATUS_TITLES[status] ?? 'Error',
      error.message,
      `urn:neurotech:error:${error.type}`
    )
  }

  /**
   * Build a Problem Details from an HTTP status code and an optional detail.
   */
  static fromStatus(status: number, detail?: string): HttpProblem {
    return new HttpProblem(status, HTTP_STATUS_TITLES[status] ?? 'Error', detail)
  }

  // ---------------------------------------------------------------------------
  // Serialisation
  // ---------------------------------------------------------------------------

  toJSON(): Record<string, unknown> {
    return {
      detail: this.detail,
      instance: this.instance,
      status: this.status,
      title: this.title,
      type: this.type,
      ...this.extensions,
    }
  }

  /**
   * Write the Problem Details onto an AdonisJS response object.
   * Sets the correct Content-Type and status code.
   */
  toResponse(response: {
    header(key: string, value: string): unknown
    json(body: unknown): unknown
    status(code: number): unknown
  }): void {
    response.status(this.status)
    response.header('Content-Type', 'application/problem+json')
    response.json(this.toJSON())
  }
}

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

interface BetterAuthErrorEntry {
  status: number
  userMessage: string
}

// =============================================================================
// Better Auth error code → { status, userMessage }
// =============================================================================

/**
 * Resolve an HTTP status from a domain-error tag string.
 * Falls back to 500 for unknown tags.
 */
export function domainErrorToHttpStatus(tag: string): number {
  return DOMAIN_TAG_TO_HTTP[tag as DomainErrorTag] ?? 500
}

const BETTER_AUTH_ERROR_MAP: Record<string, BetterAuthErrorEntry> = {
  _default: {
    status: 500,
    userMessage: 'An unexpected error occurred. Please try again.',
  },
  CREDENTIAL_ACCOUNT_NOT_FOUND: {
    status: 401,
    userMessage: 'Invalid email or password.',
  },
  EMAIL_NOT_VERIFIED: {
    status: 403,
    userMessage: 'Please verify your email address before signing in.',
  },
  FAILED_TO_CREATE_USER: {
    status: 500,
    userMessage: 'Unable to create account. Please try again.',
  },
  INVALID_EMAIL: {
    status: 422,
    userMessage: 'The email address is invalid.',
  },
  INVALID_EMAIL_OR_PASSWORD: {
    status: 401,
    userMessage: 'Invalid email or password.',
  },
  INVALID_PASSWORD: {
    status: 422,
    userMessage: 'The password does not meet the requirements.',
  },
  INVALID_TOKEN: {
    status: 401,
    userMessage: 'The link has expired or is invalid.',
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
    userMessage: 'An account with this email already exists.',
  },
  USER_NOT_FOUND: {
    status: 404,
    userMessage: 'No account found with this email.',
  },
}

/**
 * Look up a known Better Auth error code and return its HTTP status
 * and user-facing message.
 */
export function lookupBetterAuthError(code: string | undefined): BetterAuthErrorEntry {
  return BETTER_AUTH_ERROR_MAP[code ?? ''] ?? BETTER_AUTH_ERROR_MAP['_default']
}

// =============================================================================
// Standard HTTP status → title
// =============================================================================

const HTTP_STATUS_TITLES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  500: 'Internal Server Error',
}
