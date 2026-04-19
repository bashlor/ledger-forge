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
        operation: 'query',
        params: ['demo'],
        query: 'select 1',
      },
      message: 'Drizzle query',
    })
  })
})
