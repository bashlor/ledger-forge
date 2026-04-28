import { test } from '@japa/runner'

import { fromCents, toCents, toSafeCentsNumber } from './money.js'

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

test.group('money.toSafeCentsNumber', () => {
  test('converts SQL aggregate string values', ({ assert }) => {
    assert.equal(toSafeCentsNumber('12345'), 12345)
    assert.equal(toSafeCentsNumber(' 12345 '), 12345)
  })

  test('converts bigint aggregate values inside the safe integer range', ({ assert }) => {
    assert.equal(toSafeCentsNumber(12345n), 12345)
  })

  test('defaults nullable aggregate values to zero', ({ assert }) => {
    assert.equal(toSafeCentsNumber(null), 0)
    assert.equal(toSafeCentsNumber(undefined), 0)
  })

  test('rejects non-integer aggregate values', ({ assert }) => {
    assert.throws(() => toSafeCentsNumber('12.34'), /integer cents/)
    assert.throws(() => toSafeCentsNumber('not-a-number'), /integer cents/)
    assert.throws(() => toSafeCentsNumber(12.34), /integer cents/)
    assert.throws(() => toSafeCentsNumber(Number.NaN), /integer cents/)
  })

  test('rejects values outside the JavaScript safe integer range', ({ assert }) => {
    assert.throws(() => toSafeCentsNumber(`${Number.MAX_SAFE_INTEGER + 1}`), /safe integer/)
    assert.throws(() => toSafeCentsNumber(BigInt(Number.MAX_SAFE_INTEGER) + 1n), /safe integer/)
  })
})
