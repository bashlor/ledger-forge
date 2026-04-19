import { runWithRequestStructuredLogContext } from '#core/common/logging/request_log_context'
import { test } from '@japa/runner'

import { StructuredUserManagementActivitySink } from './activity_log.js'

test.group('Structured user management activity sink', () => {
  test('logs a complete structured user management event', ({ assert }) => {
    const calls: { bindings: Record<string, unknown>; message: string }[] = []
    const sink = new StructuredUserManagementActivitySink({
      debug(bindings, message) {
        calls.push({ bindings, message })
      },
      error(bindings, message) {
        calls.push({ bindings, message })
      },
      fatal(bindings, message) {
        calls.push({ bindings, message })
      },
      info(bindings, message) {
        calls.push({ bindings, message })
      },
      trace(bindings, message) {
        calls.push({ bindings, message })
      },
      warn(bindings, message) {
        calls.push({ bindings, message })
      },
    })

    sink.record({
      context: 'UserManagement',
      entityId: 'user-1',
      entityType: 'user',
      event: 'sign_in_success',
      level: 'info',
      outcome: 'success',
      requestId: 'req-1',
      timestamp: '2026-01-01T00:00:00.000Z',
      userId: 'user-1',
    })

    assert.lengthOf(calls, 1)
    assert.deepEqual(calls[0], {
      bindings: {
        context: 'UserManagement',
        entityId: 'user-1',
        entityType: 'user',
        event: 'sign_in_success',
        level: 'info',
        outcome: 'success',
        requestId: 'req-1',
        tenantId: null,
        timestamp: '2026-01-01T00:00:00.000Z',
        userId: 'user-1',
      },
      message: 'UserManagement sign_in_success success',
    })
  })

  test('uses request-scoped defaults when explicit values are omitted', ({ assert }) => {
    const calls: { bindings: Record<string, unknown>; message: string }[] = []
    const sink = new StructuredUserManagementActivitySink({
      debug(bindings, message) {
        calls.push({ bindings, message })
      },
      error(bindings, message) {
        calls.push({ bindings, message })
      },
      fatal(bindings, message) {
        calls.push({ bindings, message })
      },
      info(bindings, message) {
        calls.push({ bindings, message })
      },
      trace(bindings, message) {
        calls.push({ bindings, message })
      },
      warn(bindings, message) {
        calls.push({ bindings, message })
      },
    })

    runWithRequestStructuredLogContext(
      {
        context: 'UserManagement',
        requestId: 'req-ctx',
        tenantId: 'tenant-1',
        userId: 'user-ctx',
      },
      () =>
        sink.record({
          context: 'UserManagement',
          entityId: 'authentication',
          entityType: 'auth',
          event: 'better_auth_log',
          level: 'info',
          outcome: 'success',
          requestId: undefined as never,
          timestamp: '2026-01-01T00:00:00.000Z',
          userId: undefined,
        })
    )

    assert.lengthOf(calls, 1)
    assert.deepInclude(calls[0]!.bindings, {
      requestId: 'req-ctx',
      tenantId: 'tenant-1',
      userId: 'user-ctx',
    })
  })
})
