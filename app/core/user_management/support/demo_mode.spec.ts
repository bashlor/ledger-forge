import { test } from '@japa/runner'

import { isAnonymousDemoAuthEnabled, isDemoModeEnabled } from './demo_mode.js'

test.group('demo mode', () => {
  test('reads demo mode as an explicit boolean flag outside production', ({ assert }) => {
    assert.isTrue(isDemoModeEnabled(true, { nodeEnv: 'development' }))
    assert.isFalse(isDemoModeEnabled(false, { nodeEnv: 'development' }))
  })

  test('requires DEMO_PRODUCTION_FORCE in production when demo flag is set', ({ assert }) => {
    assert.isFalse(isDemoModeEnabled(true, { demoProductionForce: false, nodeEnv: 'production' }))
    assert.isTrue(isDemoModeEnabled(true, { demoProductionForce: true, nodeEnv: 'production' }))
    assert.isFalse(isDemoModeEnabled(false, { demoProductionForce: true, nodeEnv: 'production' }))
  })

  test('allows anonymous auth only when effective demo mode is on outside tests', ({ assert }) => {
    assert.isTrue(
      isAnonymousDemoAuthEnabled({
        demoModeEnabled: true,
        nodeEnv: 'development',
      })
    )
    assert.isFalse(
      isAnonymousDemoAuthEnabled({
        demoModeEnabled: true,
        nodeEnv: 'production',
      })
    )
    assert.isTrue(
      isAnonymousDemoAuthEnabled({
        demoModeEnabled: true,
        demoProductionForce: true,
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
