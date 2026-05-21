import {
  ACCOUNTING_READ_ONLY_MESSAGE,
  AuditTrailHealthService,
} from '#core/accounting/application/audit/audit_trail_health_service'
import { healthChecks } from '#start/health'
import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'

import {
  bindAuditTrailHealthStub,
  bindCoreReadinessStub,
} from '../../../../../tests/helpers/routes_test_support.js'

test.group('Health routes', (group) => {
  const originalRun = healthChecks.run.bind(healthChecks)

  group.each.setup(() => {
    bindCoreReadinessStub('ok')
  })

  group.each.teardown(() => {
    ;(healthChecks as any).run = originalRun
    app.container.restore(AuditTrailHealthService)
  })

  test('GET /health/ready returns a readiness payload when audit trail storage is healthy', async ({
    client,
  }) => {
    bindAuditTrailHealthStub(true)
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
    bindAuditTrailHealthStub(false)
    const response = await client.get('/health/ready')
    response.assertStatus(200)
    response.assertBodyContains({
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

  test('GET /health/live returns a minimal liveness payload', async ({ client }) => {
    const response = await client.get('/health/live')
    response.assertStatus(200)
    response.assertBodyContains({ status: 'ok' })
  })
})
