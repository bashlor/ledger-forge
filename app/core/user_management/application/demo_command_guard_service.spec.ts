import { DomainError } from '#core/common/errors/domain_error'
import { test } from '@japa/runner'

import { DemoCommandGuardService } from './demo_command_guard_service.js'

test.group('DemoCommandGuardService', () => {
  test('allows tenant when commands are enabled and no allowlist is configured', ({ assert }) => {
    const guard = new DemoCommandGuardService(true, [])

    assert.doesNotThrow(() => guard.ensureTenantAllowed('tenant-a'))
  })

  test('rejects access when commands are disabled', ({ assert }) => {
    const guard = new DemoCommandGuardService(false, [])

    try {
      guard.ensureTenantAllowed('tenant-a')
      assert.fail('Expected guard to reject when commands are disabled.')
    } catch (error) {
      assert.instanceOf(error, DomainError)
      assert.equal(error.message, 'Demo commands are not available in this environment.')
    }
  })

  test('rejects non-allowlisted tenants when an allowlist is configured', ({ assert }) => {
    const guard = new DemoCommandGuardService(true, ['tenant-a'])

    try {
      guard.ensureTenantAllowed('tenant-b')
      assert.fail('Expected guard to reject non-allowlisted tenant.')
    } catch (error) {
      assert.instanceOf(error, DomainError)
      assert.equal(error.message, 'Tenant tenant-b is not allowlisted for demo commands.')
    }
  })
})
