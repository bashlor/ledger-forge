import type { HealthCheckResult } from '@adonisjs/core/types/health'

import { AuditTrailHealthService } from '#core/accounting/application/audit/audit_trail_health_service'
import { BaseCheck, Result } from '@adonisjs/core/health'
import app from '@adonisjs/core/services/app'

export class AuditTrailCheck extends BaseCheck {
  name = 'Audit trail health check'

  async run(): Promise<HealthCheckResult> {
    const service = await app.container.make(AuditTrailHealthService)
    const status = await service.getStatus()

    if (status.healthy) {
      return Result.ok(status.message)
    }

    return Result.failed(status.message)
  }
}
