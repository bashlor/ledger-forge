import { test } from '@japa/runner'

import { userManagementHttpLogger } from './activity_log.js'

function createContext() {
  const calls: { bindings: Record<string, unknown>; message: string }[] = []

  return {
    calls,
    ctx: {
      authSession: {
        session: { expiresAt: new Date(), token: 'session-token', userId: 'user-1' },
        user: {
          createdAt: new Date(),
          email: 'sam@example.com',
          emailVerified: true,
          id: 'user-1',
          isAnonymous: false,
          name: 'Sam',
        },
      },
      logger: {
        debug(bindings: Record<string, unknown>, message: string) {
          calls.push({ bindings, message })
        },
        error(bindings: Record<string, unknown>, message: string) {
          calls.push({ bindings, message })
        },
        fatal(bindings: Record<string, unknown>, message: string) {
          calls.push({ bindings, message })
        },
        info(bindings: Record<string, unknown>, message: string) {
          calls.push({ bindings, message })
        },
        trace(bindings: Record<string, unknown>, message: string) {
          calls.push({ bindings, message })
        },
        warn(bindings: Record<string, unknown>, message: string) {
          calls.push({ bindings, message })
        },
      },
      request: {
        header(name: string) {
          return name.toLowerCase() === 'x-request-id' ? 'req-1' : null
        },
      },
    },
  }
}

test.group('User management HTTP activity logger', () => {
  test('logs failures with merged defaults and error metadata', ({ assert }) => {
    const { calls, ctx } = createContext()
    const logger = userManagementHttpLogger(ctx as never, {
      entityId: 'authentication',
      entityType: 'auth',
      metadata: { source: 'controller' },
    })

    logger.failure('sign_in_failure', new Error('boom'))

    assert.lengthOf(calls, 1)
    assert.deepInclude(calls[0]!.bindings, {
      context: 'UserManagement',
      entityId: 'authentication',
      entityType: 'auth',
      event: 'sign_in_failure',
      level: 'warn',
      outcome: 'failure',
      requestId: 'req-1',
      userId: 'user-1',
    })
    assert.deepEqual(calls[0]!.bindings.metadata, {
      errorName: 'Error',
      source: 'controller',
    })
  })

  test('wraps simple actions and logs success then failure', async ({ assert }) => {
    const { calls, ctx } = createContext()
    const logger = userManagementHttpLogger(ctx as never, {
      entityType: 'auth',
    })

    const result = await logger.run(async () => ({ id: 'user-9' }), {
      failure: { entityId: 'authentication', event: 'sign_up_failure' },
      success: (authentication) => ({
        entityId: authentication.id,
        entityType: 'user',
        event: 'sign_up_success',
      }),
    })

    assert.deepEqual(result, { id: 'user-9' })
    assert.lengthOf(calls, 1)
    assert.deepInclude(calls[0]!.bindings, {
      entityId: 'user-9',
      entityType: 'user',
      event: 'sign_up_success',
      outcome: 'success',
    })

    await assert.rejects(() =>
      logger.run(async () => Promise.reject(new Error('nope')), {
        failure: { entityId: 'authentication', event: 'sign_up_failure' },
        success: { entityId: 'user-9', entityType: 'user', event: 'sign_up_success' },
      })
    )

    assert.lengthOf(calls, 2)
    assert.deepInclude(calls[1]!.bindings, {
      entityId: 'authentication',
      entityType: 'auth',
      event: 'sign_up_failure',
      outcome: 'failure',
    })
  })
})
