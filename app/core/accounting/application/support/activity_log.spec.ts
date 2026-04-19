import { runWithRequestStructuredLogContext } from '#core/common/logging/request_log_context'
import { test } from '@japa/runner'

import { StructuredAccountingActivitySink } from './activity_log.js'

test.group('Structured accounting activity sink', () => {
  test('logs the event with merged fields and a stable message', ({ assert }) => {
    const calls: { bindings: Record<string, unknown>; message: string }[] = []
    const sink = new StructuredAccountingActivitySink(
      {
        info(bindings, message) {
          calls.push({ bindings, message })
        },
      },
      { adapter: 'service' }
    )

    sink.record({
      actorId: 'user-1',
      boundedContext: 'accounting',
      context: 'Accounting',
      entityId: 'inv-1',
      entityType: 'invoice',
      event: 'create_invoice_draft',
      isAnonymous: false,
      level: 'info',
      operation: 'create_invoice_draft',
      outcome: 'success',
      requestId: 'req-1',
      resourceId: 'inv-1',
      resourceType: 'invoice',
      tenantId: 'tenant-1',
      timestamp: '2026-01-01T00:00:00.000Z',
      userId: 'user-1',
    })

    assert.lengthOf(calls, 1)
    assert.deepEqual(calls[0], {
      bindings: {
        actorId: 'user-1',
        adapter: 'service',
        boundedContext: 'accounting',
        context: 'Accounting',
        entityId: 'inv-1',
        entityType: 'invoice',
        event: 'create_invoice_draft',
        isAnonymous: false,
        level: 'info',
        operation: 'create_invoice_draft',
        outcome: 'success',
        requestId: 'req-1',
        resourceId: 'inv-1',
        resourceType: 'invoice',
        tenantId: 'tenant-1',
        timestamp: '2026-01-01T00:00:00.000Z',
        userId: 'user-1',
      },
      message: 'Accounting create_invoice_draft success',
    })
  })

  test('uses request-scoped defaults and the configured level', ({ assert }) => {
    const calls: { bindings: Record<string, unknown>; level: string; message: string }[] = []
    const sink = new StructuredAccountingActivitySink({
      debug(bindings, message) {
        calls.push({ bindings, level: 'debug', message })
      },
      error(bindings, message) {
        calls.push({ bindings, level: 'error', message })
      },
      fatal(bindings, message) {
        calls.push({ bindings, level: 'fatal', message })
      },
      info(bindings, message) {
        calls.push({ bindings, level: 'info', message })
      },
      trace(bindings, message) {
        calls.push({ bindings, level: 'trace', message })
      },
      warn(bindings, message) {
        calls.push({ bindings, level: 'warn', message })
      },
    })

    runWithRequestStructuredLogContext(
      {
        context: 'Accounting',
        requestId: 'req-ctx',
        tenantId: 'tenant-1',
        userId: 'user-ctx',
      },
      () =>
        sink.record({
          isAnonymous: false,
          operation: 'delete_customer',
          outcome: 'failure',
          resourceType: 'customer',
        })
    )

    assert.lengthOf(calls, 1)
    assert.deepInclude(calls[0]!, {
      level: 'warn',
      message: 'Accounting delete_customer failure',
    })
    assert.deepInclude(calls[0]!.bindings, {
      context: 'Accounting',
      entityId: 'unknown',
      entityType: 'customer',
      operation: 'delete_customer',
      requestId: 'req-ctx',
      tenantId: 'tenant-1',
      userId: 'user-ctx',
    })
  })
})
