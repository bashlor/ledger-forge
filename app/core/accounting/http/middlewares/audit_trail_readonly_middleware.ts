import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import { getAccountingReadOnlyState } from '#core/accounting/application/audit/accounting_readonly_policy'
import { HttpProblem } from '#core/common/resources/http_problem'

export default class AuditTrailReadonlyMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const state = await getAccountingReadOnlyState()

    if (!state.enabled) {
      return next()
    }

    if (wantsJson(ctx)) {
      new HttpProblem(
        503,
        'Service Unavailable',
        state.message,
        'urn:accounting-app:error:audit-trail-degraded',
        undefined,
        { code: 'accounting.audit_trail_degraded' }
      ).toResponse(ctx.response)
      return
    }

    ctx.session.flash('notification', {
      message: state.message,
      type: 'error',
    })

    return ctx.response.redirect().toPath(ctx.request.header('referer') ?? '/dashboard')
  }
}

function wantsJson(ctx: HttpContext): boolean {
  const accept = ctx.request.header('accept') ?? ''
  return accept.includes('application/json') || accept.includes('application/problem+json')
}
