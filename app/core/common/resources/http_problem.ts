import { DomainError } from '#core/common/errors/domain_error'

import {
  resolveBetterAuthPublicError,
  type ResolvedPublicError,
  resolvePublicError,
} from '../errors/public_error.js'

const PROBLEM_TYPE_NAMESPACE = 'urn:accounting-app'

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
  static fromBetterAuthCode(code: string | undefined, _detail?: string): HttpProblem {
    const resolved = resolveBetterAuthPublicError(code)
    return new HttpProblem(
      resolved.status,
      HTTP_STATUS_TITLES[resolved.status] ?? 'Error',
      resolved.message,
      `${PROBLEM_TYPE_NAMESPACE}:better-auth:${code ?? 'unknown'}`,
      undefined,
      { code: resolved.code }
    )
  }

  /**
   * Build a Problem Details from any application error using the shared
   * public-error resolver.
   */
  static fromError(
    error: unknown,
    options?: { exposeInternalMessage?: boolean; statusOverride?: number }
  ): HttpProblem {
    const resolved = resolvePublicError(error, options)
    const type = problemTypeForError(error, resolved)

    return new HttpProblem(
      resolved.status,
      HTTP_STATUS_TITLES[resolved.status] ?? 'Error',
      resolved.message,
      type,
      undefined,
      { code: resolved.code }
    )
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

export { domainErrorToHttpStatus, lookupBetterAuthError } from '../errors/public_error.js'

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

function problemTypeForError(error: unknown, resolved: ResolvedPublicError): string {
  if (error instanceof DomainError) {
    return `${PROBLEM_TYPE_NAMESPACE}:error:${error.type}`
  }

  return `${PROBLEM_TYPE_NAMESPACE}:error:${resolved.code}`
}
