import type * as DrizzleSchema from '#core/common/drizzle/index'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'

import type { AuthenticationPort, AuthResult } from '../../domain/authentication.js'

import WorkspaceShareMiddleware from './workspace_share_middleware.js'

type AppDrizzleDb = PostgresJsDatabase<typeof DrizzleSchema>

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
    },
  }
}

function createContext(input: { authSession: AuthResult; cookie?: string; path: string }) {
  const redirects: string[] = []
  const { logger } = createLogger()

  return {
    authSession: input.authSession,
    logger,
    redirects,
    request: {
      cookie() {
        return input.cookie ?? null
      },
      header(name: string) {
        if (name.toLowerCase() === 'cookie' && input.cookie) {
          return `__Secure-better-auth.session_token=${input.cookie}`
        }
        return null
      },
      url(_includeQueryString?: boolean) {
        return input.path
      },
    },
    response: {
      redirect(path: string) {
        redirects.push(path)
        return path
      },
    },
    workspaceShare: undefined,
  }
}

function createLogger() {
  const warnings: { bindings: Record<string, unknown>; message: string }[] = []
  const debugs: { bindings: Record<string, unknown>; message: string }[] = []

  return {
    debugs,
    logger: {
      debug(bindings: Record<string, unknown>, message: string) {
        debugs.push({ bindings, message })
      },
      warn(bindings: Record<string, unknown>, message: string) {
        warnings.push({ bindings, message })
      },
    },
    warnings,
  }
}

test.group('WorkspaceShareMiddleware', () => {
  test('allows Better Auth routes when the session has no active organization yet', async ({
    assert,
  }) => {
    app.container.bindValue('drizzle', {} as unknown as AppDrizzleDb)

    const auth = {
      getSession: async () => createAuthSession(null),
    } satisfies Pick<AuthenticationPort, 'getSession'>

    const middleware = new WorkspaceShareMiddleware(auth as unknown as AuthenticationPort)
    const ctx = createContext({
      authSession: createAuthSession(null),
      path: '/api/auth/organization/create',
    })
    let nextCalled = false

    await middleware.handle(ctx as never, async () => {
      nextCalled = true
    })

    assert.isTrue(nextCalled)
    assert.deepEqual(ctx.redirects, [])
    assert.isUndefined(ctx.workspaceShare)
  })

  test('clears a stale active organization before continuing on Better Auth routes', async ({
    assert,
  }) => {
    const clearedTokens: string[] = []
    const db = {
      select() {
        return {
          from() {
            return {
              where() {
                return {
                  limit: async () => [],
                }
              },
            }
          },
        }
      },
      update() {
        return {
          set(payload: Record<string, unknown>) {
            assert.deepEqual(payload, { activeOrganizationId: null })
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
    app.container.bindValue('drizzle', db as unknown as AppDrizzleDb)

    const refreshed = createAuthSession(null)
    const auth = {
      getSession: async (token: null | string) => {
        assert.equal(token, 'session-token')
        return refreshed
      },
    } satisfies Pick<AuthenticationPort, 'getSession'>

    const middleware = new WorkspaceShareMiddleware(auth as unknown as AuthenticationPort)
    const ctx = createContext({
      authSession: createAuthSession('org-stale'),
      cookie: 'session-token',
      path: '/api/auth/organization/set-active',
    })
    let nextCalled = false

    await middleware.handle(ctx as never, async () => {
      nextCalled = true
    })

    assert.isTrue(nextCalled)
    assert.deepEqual(clearedTokens, ['session-token'])
    assert.isNull(ctx.authSession.session.activeOrganizationId)
    assert.deepEqual(ctx.redirects, [])
  })
})
