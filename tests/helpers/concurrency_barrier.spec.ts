import { test } from '@japa/runner'

import { ConcurrencyBarrier, runSimultaneously } from './concurrency_barrier.js'

test.group('ConcurrencyBarrier', () => {
  test('rejects invalid targets', ({ assert }) => {
    assert.throws(() => new ConcurrencyBarrier(1), 'ConcurrencyBarrier requires a target >= 2.')
  })

  test('releases waiters only when the target count is reached', async ({ assert }) => {
    const barrier = new ConcurrencyBarrier(2)
    const order: string[] = []

    const first = (async () => {
      order.push('first:before')
      await barrier.wait()
      order.push('first:after')
    })()

    await Promise.resolve()
    order.push('between')

    const second = (async () => {
      order.push('second:before')
      await barrier.wait()
      order.push('second:after')
    })()

    await Promise.all([first, second])

    assert.deepEqual(order, [
      'first:before',
      'between',
      'second:before',
      'first:after',
      'second:after',
    ])
  })

  test('runs operations simultaneously and returns settled results', async ({ assert }) => {
    const results = await runSimultaneously([
      async (waitAtBarrier) => {
        await waitAtBarrier()
        return 'ok'
      },
      async (waitAtBarrier) => {
        await waitAtBarrier()
        throw new Error('boom')
      },
    ])

    assert.equal(results[0].status, 'fulfilled')
    assert.equal(results[1].status, 'rejected')
    if (results[0].status === 'fulfilled') {
      assert.equal(results[0].value, 'ok')
    }
  })
})
