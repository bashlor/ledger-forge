import {
  ACCOUNTING_READ_ONLY_MESSAGE,
  AuditTrailHealthService,
} from '#core/accounting/application/audit/audit_trail_health_service'
import { AUTH_SESSION_TOKEN_COOKIE_NAME } from '#core/user_management/auth_session_cookie'
import { healthChecks } from '#start/health'
import app from '@adonisjs/core/services/app'

export function authCookieFromToken(token: string) {
  return `${AUTH_SESSION_TOKEN_COOKIE_NAME}=${token}`
}

export function bindAuditTrailHealthStub(healthy: boolean) {
  app.container.swap(AuditTrailHealthService, async () => {
    return {
      async getStatus() {
        return {
          healthy,
          message: healthy ? 'Audit trail storage is available.' : ACCOUNTING_READ_ONLY_MESSAGE,
        }
      },
      async isHealthy() {
        return healthy
      },
    } as AuditTrailHealthService
  })
}

export function bindCoreReadinessStub(status: 'error' | 'ok') {
  ;(healthChecks as any).run = async () => ({
    checks: [
      {
        finishedAt: new Date('2026-04-21T10:00:00.000Z'),
        isCached: false,
        message:
          status === 'ok'
            ? 'Successfully connected to the database and all migrations are applied'
            : 'Database is unreachable or migration check failed',
        name: 'Database health check (postgres/drizzle)',
        status,
      },
    ],
    debugInfo: {
      pid: 123,
      platform: 'linux',
      uptime: 1,
      version: 'v24.0.0',
    },
    finishedAt: new Date('2026-04-21T10:00:00.000Z'),
    isHealthy: status === 'ok',
    status,
  })
}

export function dateOnlyUtcFromDate(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function withInertiaHeaders(request: any) {
  request.header('x-inertia', 'true')
  request.header('x-inertia-version', '1')
  return request
}
