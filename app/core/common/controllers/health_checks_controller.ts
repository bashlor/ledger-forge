import type { HttpContext } from '@adonisjs/core/http'

import { getAccountingReadOnlyState } from '#core/accounting/application/audit/accounting_readonly_policy'
import { healthChecks } from '#start/health'

export default class HealthChecksController {
  /**
   * Liveness probe: Returns 200 if the process is running.
   * Does not check dependencies.
   */
  async live({ response }: HttpContext) {
    return response.ok({ status: 'ok' })
  }

  async ready({ response }: HttpContext) {
    const [readiness, auditTrail] = await Promise.all([
      healthChecks.run(),
      getAccountingReadOnlyState(),
    ])
    const [databaseCheck] = readiness.checks

    return response.status(readiness.isHealthy ? 200 : 503).json({
      checks: {
        database: databaseCheck
          ? {
              message: databaseCheck.message,
              status: databaseCheck.status,
            }
          : null,
      },
      signals: {
        auditTrail: {
          affects: auditTrail.enabled ? 'accounting_writes' : 'none',
          message: auditTrail.message,
          status: auditTrail.signalStatus,
        },
      },
      status: readiness.status,
    })
  }
}
