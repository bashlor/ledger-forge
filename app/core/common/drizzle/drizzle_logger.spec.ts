import { runWithRequestStructuredLogContext } from '#core/common/logging/request_log_context'
import { test } from '@japa/runner'

import { DrizzleLogger } from './drizzle_logger.js'

test.group('DrizzleLogger', () => {
  test('logs queries with structured drizzle fields', ({ assert }) => {
    const calls: { bindings: Record<string, unknown>; message: string }[] = []
    const logger = new DrizzleLogger({
      trace(bindings, message) {
        calls.push({ bindings, message })
      },
    })

    logger.logQuery('select 1', ['demo'])

    assert.lengthOf(calls, 1)
    assert.deepEqual(calls[0], {
      bindings: {
        adapter: 'drizzle',
        boundedContext: 'common',
        context: 'Accounting',
        entityId: 'database',
        entityType: 'query',
        event: 'db.query',
        level: 'trace',
        operation: 'query',
        paramsCount: 1,
        query: 'select 1',
        requestId: 'unknown',
        tenantId: null,
        timestamp: calls[0]?.bindings.timestamp,
        userId: null,
      },
      message: 'Drizzle query',
    })
    assert.isString(calls[0]?.bindings.timestamp)
  })

  test('reuses request-scoped structured fields when available', ({ assert }) => {
    const calls: { bindings: Record<string, unknown>; message: string }[] = []
    const logger = new DrizzleLogger({
      trace(bindings, message) {
        calls.push({ bindings, message })
      },
    })

    runWithRequestStructuredLogContext(
      {
        context: 'UserManagement',
        requestId: 'req-ctx',
        tenantId: 'tenant-1',
        userId: 'user-1',
      },
      () => logger.logQuery('select 1', [])
    )

    assert.lengthOf(calls, 1)
    assert.deepInclude(calls[0]!.bindings, {
      context: 'UserManagement',
      requestId: 'req-ctx',
      tenantId: 'tenant-1',
      userId: 'user-1',
    })
  })
})
