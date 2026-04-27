import { test } from '@japa/runner'

import { isDemoCommandAccessEnabled } from './demo_command_access.js'

test.group('demo command access', () => {
  test('keeps commands disabled by default in development', ({ assert }) => {
    assert.isFalse(
      isDemoCommandAccessEnabled({
        commandsEnabled: false,
        nodeEnv: 'development',
      })
    )
  })

  test('enables commands explicitly in development', ({ assert }) => {
    assert.isTrue(
      isDemoCommandAccessEnabled({
        commandsEnabled: true,
        nodeEnv: 'development',
      })
    )
  })

  test('always disables commands in production', ({ assert }) => {
    assert.isFalse(
      isDemoCommandAccessEnabled({
        commandsEnabled: true,
        nodeEnv: 'production',
      })
    )
  })

  test('always enables commands in test', ({ assert }) => {
    assert.isTrue(
      isDemoCommandAccessEnabled({
        commandsEnabled: false,
        nodeEnv: 'test',
      })
    )
  })
})
