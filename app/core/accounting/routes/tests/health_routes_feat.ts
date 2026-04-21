import {
  ACCOUNTING_READ_ONLY_MESSAGE,
  AuditTrailHealthService,
} from '#core/accounting/application/audit/audit_trail_health_service'
import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'

function bindAuditTrailHealth(healthy: boolean) {
  app.container.bindValue(AuditTrailHealthService, {
    async getStatus() {
      return {
        healthy,
        message: healthy ? 'Audit trail storage is available.' : ACCOUNTING_READ_ONLY_MESSAGE,
      }
    },
    async isHealthy() {
      return healthy
    },
  } as AuditTrailHealthService)
}

test.group('Health routes', () => {
  test('GET /health/ready returns a readiness payload when audit trail storage is healthy', async ({
    client,
  }) => {
    bindAuditTrailHealth(true)

    const response = await client.get('/health/ready')

    response.assertStatus(200)
    response.assertBodyContains({
      checks: { auditTrail: { message: 'Audit trail storage is available.', status: 'ok' } },
      status: 'ok',
    })
  })

  test('GET /health/ready returns 503 when audit trail storage is degraded', async ({ client }) => {
    bindAuditTrailHealth(false)

    const response = await client.get('/health/ready')

    response.assertStatus(503)
    response.assertBodyContains({
      checks: { auditTrail: { message: ACCOUNTING_READ_ONLY_MESSAGE, status: 'degraded' } },
      status: 'degraded',
    })
  })

  test('GET /health/live returns a minimal liveness payload', async ({ client }) => {
    const response = await client.get('/health/live')

    response.assertStatus(200)
    response.assertBodyContains({ status: 'ok' })
  })
})
