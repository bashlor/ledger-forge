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
      isAnonymous: false,
      operation: 'create_invoice_draft',
      outcome: 'success',
      resourceId: 'inv-1',
      resourceType: 'invoice',
    })

    assert.lengthOf(calls, 1)
    assert.deepEqual(calls[0], {
      bindings: {
        actorId: 'user-1',
        adapter: 'service',
        boundedContext: 'accounting',
        isAnonymous: false,
        operation: 'create_invoice_draft',
        outcome: 'success',
        resourceId: 'inv-1',
        resourceType: 'invoice',
      },
      message: 'Accounting create_invoice_draft success',
    })
  })
})
