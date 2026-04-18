import { test } from '@japa/runner'

import { toCents } from './money.js'

test.group('money.toCents', () => {
  test('rounds decimal values to cents without floating-point drift', ({ assert }) => {
    assert.equal(toCents(1.005), 101)
    assert.equal(toCents(99.99), 9999)
    assert.equal(toCents(42.5), 4250)
  })

  test('handles whole amounts and zero', ({ assert }) => {
    assert.equal(toCents(0), 0)
    assert.equal(toCents(10), 1000)
    assert.equal(toCents(250), 25000)
  })
})
