import type { HttpContext } from '@adonisjs/core/http'

import { AuditTrailHealthService } from '#core/accounting/application/audit/audit_trail_health_service'
import app from '@adonisjs/core/services/app'

export default class HealthChecksController {
  /**
   * Liveness probe: Returns 200 if the process is running.
   * Does not check dependencies.
   */
  async live({ response }: HttpContext) {
    return response.ok({ status: 'ok' })
  }

  async ready({ response }: HttpContext) {
    const healthService = await app.container.make(AuditTrailHealthService)
    const auditTrail = await healthService.getStatus()
    const status = auditTrail.healthy ? 'ok' : 'degraded'

    return response.status(auditTrail.healthy ? 200 : 503).json({
      checks: {
        auditTrail: {
          message: auditTrail.message,
          status,
        },
      },
      status,
    })
  }
}
