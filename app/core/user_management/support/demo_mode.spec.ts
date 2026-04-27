import { test } from '@japa/runner'

import { isAnonymousDemoAuthEnabled, isDemoModeEnabled } from './demo_mode.js'

test.group('demo mode', () => {
  test('reads demo mode as an explicit boolean flag', ({ assert }) => {
    assert.isTrue(isDemoModeEnabled(true))
    assert.isFalse(isDemoModeEnabled(false))
  })

  test('allows anonymous auth only in demo mode outside tests', ({ assert }) => {
    assert.isTrue(
      isAnonymousDemoAuthEnabled({
        demoModeEnabled: true,
        nodeEnv: 'development',
      })
    )
    assert.isTrue(
      isAnonymousDemoAuthEnabled({
        demoModeEnabled: true,
        nodeEnv: 'production',
      })
    )
    assert.isFalse(
      isAnonymousDemoAuthEnabled({
        demoModeEnabled: false,
        nodeEnv: 'development',
      })
    )
    assert.isFalse(
      isAnonymousDemoAuthEnabled({
        demoModeEnabled: false,
        nodeEnv: 'production',
      })
    )
  })

  test('keeps anonymous auth available in tests', ({ assert }) => {
    assert.isTrue(
      isAnonymousDemoAuthEnabled({
        demoModeEnabled: false,
        nodeEnv: 'test',
      })
    )
  })
})
