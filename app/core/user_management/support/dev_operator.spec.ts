import { test } from '@japa/runner'

import { isDevelopmentEnvironment, isDevToolsRuntimeEnabled } from './dev_operator.js'

test.group('isDevelopmentEnvironment', () => {
  test('returns true only for development', ({ assert }) => {
    assert.isTrue(isDevelopmentEnvironment('development'))
    assert.isFalse(isDevelopmentEnvironment('test'))
    assert.isFalse(isDevelopmentEnvironment('production'))
  })
})

test.group('isDevToolsRuntimeEnabled', () => {
  test('is enabled in development and test', ({ assert }) => {
    assert.isTrue(isDevToolsRuntimeEnabled('development'))
    assert.isTrue(isDevToolsRuntimeEnabled('test'))
  })

  test('is disabled in production — dev tools routes and provider must not be loaded', ({
    assert,
  }) => {
    assert.isFalse(isDevToolsRuntimeEnabled('production'))
  })
})
