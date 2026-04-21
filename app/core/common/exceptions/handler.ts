import type { StatusPageRange, StatusPageRenderer } from '@adonisjs/core/types/http'

import { DomainError } from '#core/common/errors/domain_error'
import { resolveHttpErrorStatus } from '#core/common/errors/domain_error_status'
import { type ResolvedPublicError, resolvePublicError } from '#core/common/errors/public_error'
import { presentPublicError } from '#core/common/http/presenters/inertia_public_error_presenter'
import { ExceptionHandler, type HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'

import { HttpProblem } from '../resources/http_problem.js'

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors
   * with pretty printed stack traces.
   */
  protected debug = !app.inProduction

  /**
   * Status pages are used to display a custom HTML pages for certain error
   * codes. Always enabled so Inertia pages are served in dev and production.
   */
  protected renderStatusPages = true

  /**
   * Status pages is a collection of error code range and a callback
   * to return the HTML contents to send as a response.
   */
  protected statusPages: Record<StatusPageRange, StatusPageRenderer> = {
    '400..403': (_, { inertia }) => inertia.render('errors/forbidden', {}),
    '404': (_, { inertia }) => inertia.render('errors/not_found', {}),
    '405..499': (_, { inertia }) => inertia.render('errors/not_found', {}),
    '500..599': (_, { inertia }) => inertia.render('errors/server_error', {}),
  }

  /**
   * Handle errors and return a response to the client.
   *
   * - Auth/domain errors are mapped to flash messages or Problem Details.
   * - DomainErrors are mapped to HTTP status codes via their `.type` tag.
   * - JSON consumers receive RFC 7807 Problem Details.
   * - HTML/Inertia consumers fall through to the default AdonisJS behaviour.
   */
  async handle(error: unknown, ctx: HttpContext) {
    // ----- DomainError → proper HTTP status + Problem Details -----
    if (error instanceof DomainError) {
      const problem = HttpProblem.fromError(error)

      if (wantsJson(ctx)) {
        problem.toResponse(ctx.response)
        return
      }

      const resolved = resolvePublicError(error)

      // Route only form-presentable errors through the shared presenter for web flows.
      if (shouldPresentDomainErrorAsFormRedirect(resolved, ctx)) {
        presentPublicError(ctx, error, { flashAll: true })
        return
      }

      // For Inertia/HTML: set the status so AdonisJS renders the right page
      ctx.response.status(problem.status)
      return super.handle(error, ctx)
    }

    // ----- Generic unhandled error + JSON consumer → Problem Details -----
    if (wantsJson(ctx)) {
      const status = resolveHttpErrorStatus(error)
      HttpProblem.fromError(error, {
        exposeInternalMessage: !app.inProduction,
        statusOverride: status,
      }).toResponse(ctx.response)
      return
    }

    return super.handle(error, ctx)
  }

  /**
   * The method is used to report error to the logging service or
   * the a third party error monitoring service.
   *
   * @note You should not attempt to send a response from this method.
   */
  async report(error: unknown, ctx: HttpContext) {
    // Expected 404s are handled above; logging them at error level adds noise in tests and dev.
    if (error instanceof DomainError && error.type === 'not_found') {
      return
    }
    return super.report(error, ctx)
  }
}

export function shouldPresentDomainErrorAsFormRedirect(
  resolved: ResolvedPublicError,
  ctx: HttpContext
): boolean {
  return (
    resolved.presentation === 'form' &&
    ctx.request.method() !== 'GET' &&
    ctx.request.accepts(['html']) === 'html'
  )
}

/**
 * Check whether the incoming request prefers a JSON response.
 * Returns true for explicit `Accept: application/json` or
 * `Accept: application/problem+json`.
 */
function wantsJson(ctx: HttpContext): boolean {
  const accept = ctx.request.header('accept') ?? ''
  return accept.includes('application/json') || accept.includes('application/problem+json')
}
