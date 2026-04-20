import { test } from '@japa/runner'

import { fromCents, toCents } from './money.js'

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

test.group('money.fromCents', () => {
  test('converts cents to decimal amounts', ({ assert }) => {
    assert.equal(fromCents(0), 0)
    assert.equal(fromCents(101), 1.01)
    assert.equal(fromCents(4250), 42.5)
    assert.equal(fromCents(9999), 99.99)
  })
})
