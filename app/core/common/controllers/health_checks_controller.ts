import type { HttpContext } from '@adonisjs/core/http'

export default class HealthChecksController {
  /**
   * Liveness probe: Returns 200 if the process is running.
   * Does not check dependencies.
   */
  async live({ response }: HttpContext) {
    return response.ok({ status: 'ok' })
  }
}
