import { test } from '@japa/runner'

import { generateDevPassword } from './dev_password.js'

test.group('generateDevPassword', () => {
  test('returns a random password that meets minimum length', ({ assert }) => {
    const password = generateDevPassword()

    assert.isString(password)
    assert.isAtLeast(password.length, 8)
  })

  test('returns distinct values on successive calls', ({ assert }) => {
    const first = generateDevPassword()
    const second = generateDevPassword()

    assert.notEqual(first, second)
  })
})
