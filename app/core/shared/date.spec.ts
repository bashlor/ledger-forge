import { test } from '@japa/runner'

import { isValidIsoDate } from './date.js'

test.group('shared date helpers', () => {
  test('validates real ISO calendar dates', ({ assert }) => {
    assert.isTrue(isValidIsoDate('2026-04-20'))
    assert.isTrue(isValidIsoDate('2024-02-29'))
  })

  test('rejects invalid or impossible dates', ({ assert }) => {
    assert.isFalse(isValidIsoDate('2026-02-30'))
    assert.isFalse(isValidIsoDate('2026-13-01'))
    assert.isFalse(isValidIsoDate('04-20-2026'))
  })
})
