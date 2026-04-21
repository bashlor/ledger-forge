import { DomainError } from '#core/common/errors/domain_error'
import { test } from '@japa/runner'

import StructuredRequestLoggingMiddleware from './structured_request_logging_middleware.js'

function createContext(logger: ReturnType<typeof createLogger>['logger']) {
  return {
    authSession: {
      session: { expiresAt: new Date(), token: 'secret-session-token', userId: 'user-1' },
      user: {
        createdAt: new Date(),
        email: 'sam@example.com',
        emailVerified: true,
        id: 'user-1',
        isAnonymous: false,
        name: 'Sam',
      },
    },
    logger,
    request: {
      header(name: string) {
        return name.toLowerCase() === 'x-request-id' ? 'req-123' : null
      },
      method() {
        return 'POST'
      },
      url() {
        return '/signin'
      },
    },
    response: {
      getStatus() {
        return 302
      },
    },
    route: {
      name: 'signin.store',
    },
  }
}

function createLogger() {
  const calls: { bindings: Record<string, unknown>; level: string; message: string }[] = []

  return {
    calls,
    logger: {
      error(bindings: Record<string, unknown>, message: string) {
        calls.push({ bindings, level: 'error', message })
      },
      info(bindings: Record<string, unknown>, message: string) {
        calls.push({ bindings, level: 'info', message })
      },
      warn(bindings: Record<string, unknown>, message: string) {
        calls.push({ bindings, level: 'warn', message })
      },
    },
  }
}

test.group('StructuredRequestLoggingMiddleware', () => {
  test('logs request entry and completion with structured fields', async ({ assert }) => {
    const { calls, logger } = createLogger()
    const middleware = new StructuredRequestLoggingMiddleware()
    const ctx = createContext(logger)

    await middleware.handle(ctx as never, async () => {})

    assert.lengthOf(calls, 2)
    assert.deepInclude(calls[0]!, {
      level: 'info',
      message: 'UserManagement request received',
    })
    assert.deepInclude(calls[0]!.bindings, {
      context: 'UserManagement',
      entityId: 'signin.store',
      entityType: 'http_request',
      event: 'request_received',
      level: 'info',
      method: 'POST',
      path: '/signin',
      requestId: 'req-123',
      tenantId: null,
      userId: 'user-1',
    })
    assert.notProperty(calls[0]!.bindings, 'password')
    assert.notProperty(calls[0]!.bindings, 'token')

    assert.deepInclude(calls[1]!, {
      level: 'warn',
      message: 'UserManagement request completed',
    })
    assert.deepInclude(calls[1]!.bindings, {
      context: 'UserManagement',
      entityId: 'signin.store',
      entityType: 'http_request',
      event: 'request_completed',
      level: 'warn',
      method: 'POST',
      path: '/signin',
      requestId: 'req-123',
      status: 302,
      tenantId: null,
      userId: 'user-1',
    })
    assert.isNumber(calls[1]!.bindings.durationMs)
  })

  test('logs failures and rethrows the error', async ({ assert }) => {
    const { calls, logger } = createLogger()
    const middleware = new StructuredRequestLoggingMiddleware()
    const ctx = createContext(logger)
    const error = new Error('boom')

    await assert.rejects(() => middleware.handle(ctx as never, async () => Promise.reject(error)))

    assert.lengthOf(calls, 2)
    assert.deepInclude(calls[1]!, {
      level: 'error',
      message: 'UserManagement request failed',
    })
    assert.deepInclude(calls[1]!.bindings, {
      context: 'UserManagement',
      entityId: 'signin.store',
      entityType: 'http_request',
      errorName: 'Error',
      event: 'request_failed',
      level: 'error',
      requestId: 'req-123',
      status: 500,
      tenantId: null,
      userId: 'user-1',
    })
  })

  test('logs mapped HTTP status for domain errors', async ({ assert }) => {
    const { calls, logger } = createLogger()
    const middleware = new StructuredRequestLoggingMiddleware()
    const ctx = createContext(logger)
    const error = new DomainError('You are not allowed to perform this action.', 'forbidden')

    await assert.rejects(() => middleware.handle(ctx as never, async () => Promise.reject(error)))

    assert.lengthOf(calls, 2)
    assert.deepInclude(calls[1]!.bindings, {
      errorName: 'DomainError',
      status: 403,
    })
  })
})
