import { DomainError } from '#core/common/errors/domain_error'
import { test } from '@japa/runner'

import { DemoCommandGuardService } from './demo_command_guard_service.js'

test.group('DemoCommandGuardService', () => {
  test('allows demo commands when they are enabled', ({ assert }) => {
    const guard = new DemoCommandGuardService(true)

    assert.doesNotThrow(() => guard.ensureTenantAllowed())
  })

  test('rejects access when commands are disabled', ({ assert }) => {
    const guard = new DemoCommandGuardService(false)

    try {
      guard.ensureTenantAllowed()
      assert.fail('Expected guard to reject when commands are disabled.')
    } catch (error) {
      assert.instanceOf(error, DomainError)
      assert.equal(error.message, 'Demo commands are not available in this environment.')
    }
  })
})
