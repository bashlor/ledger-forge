import { test } from '@japa/runner'

import { isDemoCommandAccessEnabled, parseDemoAllowedTenantIds } from './demo_command_access.js'

test.group('demo command access', () => {
  test('does not enable commands from demo mode in development', ({ assert }) => {
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

  test('parses allowlisted tenant ids', ({ assert }) => {
    assert.deepEqual(parseDemoAllowedTenantIds(' tenant-a,tenant-b ,, tenant-c '), [
      'tenant-a',
      'tenant-b',
      'tenant-c',
    ])
  })
})
