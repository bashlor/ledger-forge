import type { HttpContext } from '@adonisjs/core/http'

import { healthChecks } from '#start/health'

export default class HealthChecksController {
  /**
   * Liveness probe: Returns 200 if the process is running.
   * Does not check dependencies.
   */
  async live({ response }: HttpContext) {
    return response.ok({ status: 'ok' })
  }

  /**
   * Readiness probe: Runs all registered health checks
   * and returns the detailed report.
   */
  async ready({ response }: HttpContext) {
    const report = await healthChecks.run()
    if (report.isHealthy) {
      return response.ok(report)
    }

    return response.serviceUnavailable(report)
  }
}
