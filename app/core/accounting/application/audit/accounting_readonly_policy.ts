import app from '@adonisjs/core/services/app'

import { AuditTrailHealthService } from './audit_trail_health_service.js'

export interface AccountingReadOnlyState {
  enabled: boolean
  message: string
  signalStatus: 'degraded' | 'ok'
}

export async function getAccountingReadOnlyState(): Promise<AccountingReadOnlyState> {
  const healthService = await app.container.make(AuditTrailHealthService)
  const status = await healthService.getStatus()

  return {
    enabled: !status.healthy,
    message: status.message,
    signalStatus: status.healthy ? 'ok' : 'degraded',
  }
}
