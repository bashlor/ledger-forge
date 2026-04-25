import type { AuthResult } from '#core/user_management/domain/authentication'

import { AuthorizationService } from '#core/user_management/application/authorization_service'
import { AUTH_SESSION_TOKEN_COOKIE_NAME } from '#core/user_management/auth_session_cookie'
import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'

import EnsureActiveTenantMiddleware from './ensure_active_tenant_middleware.js'

function createAuthSession(activeOrganizationId: null | string): AuthResult {
  return {
    session: {
      activeOrganizationId,
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
      token: 'session-token',
      userId: 'user-1',
    },
    user: {
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      email: 'user@example.com',
      emailVerified: true,
      id: 'user-1',
      image: null,
      isAnonymous: false,
      name: 'User',
      publicId: 'pub-user-1',
    },
  }
}

function createContext(authSession: AuthResult) {
  const redirects: string[] = []
  const events: Record<string, unknown>[] = []

  return {
    authSession,
    events,
    logger: {
      error(bindings: Record<string, unknown>) {
        events.push(bindings)
      },
      warn(bindings: Record<string, unknown>) {
        events.push(bindings)
      },
    },
    redirects,
    request: {
      cookie(name: string) {
        return name === AUTH_SESSION_TOKEN_COOKIE_NAME ? 'session-token' : null
      },
      header(name: string) {
        return name.toLowerCase() === 'cookie'
          ? `${AUTH_SESSION_TOKEN_COOKIE_NAME}=session-token`
          : null
      },
    },
    response: {
      redirect(path: string) {
        redirects.push(path)
        return path
      },
    },
  }
}

function createDb(membership: null | { isActive: boolean; role: string }) {
  const clearedTokens: string[] = []

  return {
    clearedTokens,
    select() {
      return {
        from() {
          return {
            where() {
              return {
                limit: async () => (membership ? [membership] : []),
              }
            },
          }
        },
      }
    },
    update() {
      return {
        set(payload: Record<string, unknown>) {
          if (payload.activeOrganizationId !== null) {
            throw new Error('Expected active organization clear')
          }
          return {
            where() {
              clearedTokens.push('session-token')
              return Promise.resolve()
            },
          }
        },
      }
    },
  }
}

test.group('EnsureActiveTenantMiddleware', () => {
  test('redirects when no active tenant exists on the session', async ({ assert }) => {
    const db = createDb(null)
    const middleware = new EnsureActiveTenantMiddleware(
      new AuthorizationService(db as never, false)
    )
    const ctx = createContext(createAuthSession(null))
    let nextCalled = false

    await middleware.handle(ctx as never, async () => {
      nextCalled = true
    })

    assert.isFalse(nextCalled)
    assert.deepEqual(ctx.redirects, ['/'])
    assert.deepEqual(db.clearedTokens, [])
  })

  test('allows requests for an active tenant membership', async ({ assert }) => {
    const db = createDb({ isActive: true, role: 'member' })
    app.container.bindValue('drizzle', db as never)
    const middleware = new EnsureActiveTenantMiddleware(
      new AuthorizationService(db as never, false)
    )
    const ctx = createContext(createAuthSession('org-1'))
    let nextCalled = false

    await middleware.handle(ctx as never, async () => {
      nextCalled = true
    })

    assert.isTrue(nextCalled)
    assert.equal(ctx.authSession.session.activeOrganizationId, 'org-1')
    assert.deepEqual(db.clearedTokens, [])
  })

  test('clears stale active tenant before rejecting missing membership', async ({ assert }) => {
    const db = createDb(null)
    app.container.bindValue('drizzle', db as never)
    const middleware = new EnsureActiveTenantMiddleware(
      new AuthorizationService(db as never, false)
    )
    const ctx = createContext(createAuthSession('org-stale'))

    await assert.rejects(
      () => middleware.handle(ctx as never, async () => {}),
      'Active workspace membership is required for this request.'
    )
    assert.isNull(ctx.authSession.session.activeOrganizationId)
    assert.deepEqual(db.clearedTokens, ['session-token'])
    assert.deepInclude(ctx.events[0], {
      entityId: 'org-stale',
      event: 'active_tenant_membership_invalid_cleared',
      level: 'warn',
    })
  })

  test('clears stale active tenant before rejecting inactive membership', async ({ assert }) => {
    const db = createDb({ isActive: false, role: 'member' })
    app.container.bindValue('drizzle', db as never)
    const middleware = new EnsureActiveTenantMiddleware(
      new AuthorizationService(db as never, false)
    )
    const ctx = createContext(createAuthSession('org-inactive'))

    await assert.rejects(
      () => middleware.handle(ctx as never, async () => {}),
      'Active workspace membership is required for this request.'
    )
    assert.isNull(ctx.authSession.session.activeOrganizationId)
    assert.deepEqual(db.clearedTokens, ['session-token'])
  })
})
