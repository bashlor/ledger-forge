import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import {
  ACCOUNTING_READ_ONLY_MESSAGE,
  AuditTrailHealthService,
} from '#core/accounting/application/audit/audit_trail_health_service'
import { HttpProblem } from '#core/common/resources/http_problem'
import app from '@adonisjs/core/services/app'

export default class AuditTrailReadonlyMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const healthService = await app.container.make(AuditTrailHealthService)
    const status = await healthService.getStatus()

    if (status.healthy) {
      return next()
    }

    if (wantsJson(ctx)) {
      new HttpProblem(
        503,
        'Service Unavailable',
        ACCOUNTING_READ_ONLY_MESSAGE,
        'urn:accounting-app:error:audit-trail-degraded',
        undefined,
        { code: 'accounting.audit_trail_degraded' }
      ).toResponse(ctx.response)
      return
    }

    ctx.session.flash('notification', {
      message: ACCOUNTING_READ_ONLY_MESSAGE,
      type: 'error',
    })

    return ctx.response.redirect().toPath(ctx.request.header('referer') ?? '/dashboard')
  }
}

function wantsJson(ctx: HttpContext): boolean {
  const accept = ctx.request.header('accept') ?? ''
  return accept.includes('application/json') || accept.includes('application/problem+json')
}
