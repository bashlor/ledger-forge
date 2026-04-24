import { runWithRequestStructuredLogContext } from '#core/common/logging/request_log_context'
import { test } from '@japa/runner'

import {
  recordUserManagementActivityEvent,
  StructuredUserManagementActivitySink,
} from './activity_log.js'

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

  test('derives level from outcome when level is omitted', ({ assert }) => {
    const calls: { bindings: Record<string, unknown>; message: string }[] = []
    const sink = new StructuredUserManagementActivitySink({
      info(bindings, message) {
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
      outcome: 'success',
      requestId: 'req-success',
      timestamp: '2026-01-01T00:00:00.000Z',
      userId: 'user-1',
    })

    sink.record({
      context: 'UserManagement',
      entityId: 'authentication',
      entityType: 'auth',
      event: 'sign_in_failure',
      outcome: 'failure',
      requestId: 'req-failure',
      timestamp: '2026-01-01T00:00:00.000Z',
      userId: 'user-1',
    })

    assert.lengthOf(calls, 2)
    assert.equal(calls[0]!.bindings.level, 'info')
    assert.equal(calls[1]!.bindings.level, 'warn')
  })

  test('records app events with request-scoped defaults', ({ assert }) => {
    const calls: { bindings: Record<string, unknown>; message: string }[] = []
    const sink = new StructuredUserManagementActivitySink({
      info(bindings, message) {
        calls.push({ bindings, message })
      },
    })

    runWithRequestStructuredLogContext(
      {
        context: 'UserManagement',
        requestId: 'req-system',
        tenantId: 'tenant-system',
        userId: 'user-system',
      },
      () =>
        recordUserManagementActivityEvent(
          {
            entityId: 'member-1',
            entityType: 'member',
            event: 'workspace_membership_provision_success',
            outcome: 'success',
          },
          sink
        )
    )

    assert.lengthOf(calls, 1)
    assert.deepInclude(calls[0]!.bindings, {
      context: 'UserManagement',
      entityId: 'member-1',
      entityType: 'member',
      event: 'workspace_membership_provision_success',
      level: 'info',
      outcome: 'success',
      requestId: 'req-system',
      tenantId: 'tenant-system',
      userId: 'user-system',
    })
    assert.property(calls[0]!.bindings, 'timestamp')
  })
})
