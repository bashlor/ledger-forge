import { test } from '@japa/runner'

import { isDevelopmentEnvironment } from './dev_operator.js'
import { isDevToolsRuntimeEnabled } from './dev_tools_runtime.js'

test.group('isDevelopmentEnvironment', () => {
  test('returns true only for development', ({ assert }) => {
    assert.isTrue(isDevelopmentEnvironment('development'))
    assert.isFalse(isDevelopmentEnvironment('test'))
    assert.isFalse(isDevelopmentEnvironment('production'))
  })
})

test.group('isDevToolsRuntimeEnabled', () => {
  test('is enabled only when the global flag is on in development or test', ({ assert }) => {
    assert.isTrue(isDevToolsRuntimeEnabled({ enabled: true, nodeEnv: 'development' }))
    assert.isTrue(isDevToolsRuntimeEnabled({ enabled: true, nodeEnv: 'test' }))
    assert.isFalse(isDevToolsRuntimeEnabled({ enabled: false, nodeEnv: 'development' }))
    assert.isFalse(isDevToolsRuntimeEnabled({ enabled: false, nodeEnv: 'test' }))
  })

  test('defaults test runtime to enabled when the new flag is still absent', ({ assert }) => {
    assert.isTrue(isDevToolsRuntimeEnabled({ nodeEnv: 'test' }))
  })

  test('is disabled in production even when the flag is on', ({ assert }) => {
    assert.isFalse(isDevToolsRuntimeEnabled({ enabled: true, nodeEnv: 'production' }))
  })
})
