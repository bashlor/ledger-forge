import { test } from '@japa/runner'

import { isLocalDevDestructiveToolsEnabled } from './local_dev_tools.js'

test.group('local dev destructive tools', () => {
  test('enables destructive tools only when explicitly opted in for development', ({ assert }) => {
    assert.isTrue(
      isLocalDevDestructiveToolsEnabled({
        enabled: true,
        nodeEnv: 'development',
      })
    )
    assert.isFalse(
      isLocalDevDestructiveToolsEnabled({
        enabled: false,
        nodeEnv: 'development',
      })
    )
  })

  test('always disables destructive tools outside development', ({ assert }) => {
    assert.isFalse(
      isLocalDevDestructiveToolsEnabled({
        enabled: true,
        nodeEnv: 'production',
      })
    )
    assert.isFalse(
      isLocalDevDestructiveToolsEnabled({
        enabled: true,
        nodeEnv: 'test',
      })
    )
  })
})
