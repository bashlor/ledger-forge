import {
  ACCOUNTING_READ_ONLY_MESSAGE,
  AuditTrailHealthService,
} from '#core/accounting/application/audit/audit_trail_health_service'
import { healthChecks } from '#start/health'
import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'

function bindAuditTrailHealth(healthy: boolean) {
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

function bindCoreReadiness(status: 'error' | 'ok') {
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

test.group('Health routes', (group) => {
  const originalRun = healthChecks.run.bind(healthChecks)

  group.each.setup(() => {
    bindCoreReadiness('ok')
  })

  group.each.teardown(() => {
    ;(healthChecks as any).run = originalRun
    app.container.restore(AuditTrailHealthService)
  })

  test('GET /health/ready returns a readiness payload when audit trail storage is healthy', async ({
    client,
  }) => {
    bindAuditTrailHealth(true)

    const response = await client.get('/health/ready')

    response.assertStatus(200)
    response.assertBodyContains({
      checks: {
        database: {
          message: 'Successfully connected to the database and all migrations are applied',
          status: 'ok',
        },
      },
      signals: {
        auditTrail: {
          affects: 'none',
          message: 'Audit trail storage is available.',
          status: 'ok',
        },
      },
      status: 'ok',
    })
  })

  test('GET /health/ready keeps readiness ok and exposes a degraded audit signal', async ({
    client,
  }) => {
    bindAuditTrailHealth(false)

    const response = await client.get('/health/ready')

    response.assertStatus(200)
    response.assertBodyContains({
      checks: {
        database: {
          message: 'Successfully connected to the database and all migrations are applied',
          status: 'ok',
        },
      },
      signals: {
        auditTrail: {
          affects: 'accounting_writes',
          message: ACCOUNTING_READ_ONLY_MESSAGE,
          status: 'degraded',
        },
      },
      status: 'ok',
    })
  })

  test('GET /health/ready returns 503 when core readiness fails even if audit is healthy', async ({
    client,
  }) => {
    bindAuditTrailHealth(true)
    bindCoreReadiness('error')

    const response = await client.get('/health/ready')

    response.assertStatus(503)
    response.assertBodyContains({
      checks: {
        database: {
          message: 'Database is unreachable or migration check failed',
          status: 'error',
        },
      },
      signals: {
        auditTrail: {
          affects: 'none',
          message: 'Audit trail storage is available.',
          status: 'ok',
        },
      },
      status: 'error',
    })
  })

  test('GET /health/live returns a minimal liveness payload', async ({ client }) => {
    const response = await client.get('/health/live')

    response.assertStatus(200)
    response.assertBodyContains({ status: 'ok' })
  })
})
