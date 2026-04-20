import type * as DrizzleSchema from '#core/common/drizzle/index'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'

import type { AuthenticationPort, AuthResult } from '../../domain/authentication.js'

import WorkspaceShareMiddleware from './workspace_share_middleware.js'

type AppDrizzleDb = PostgresJsDatabase<typeof DrizzleSchema>

class SingleTenantTestMiddleware extends WorkspaceShareMiddleware {
  constructor(
    auth: AuthenticationPort,
    private readonly options: {
      ensureSingleTenantMembership?: () => Promise<void>
      getSingleTenantOrgId?: () => string
      hasActiveTenantMembership?: () => Promise<boolean>
      isSingleTenantMode?: boolean
    } = {}
  ) {
    super(auth)
  }

  protected override async ensureSingleTenantMembership(): Promise<void> {
    await this.options.ensureSingleTenantMembership?.()
  }

  protected override getSingleTenantOrgId(): string {
    return this.options.getSingleTenantOrgId?.() ?? 'org-single'
  }

  protected override async hasActiveTenantMembership(): Promise<boolean> {
    if (!this.options.hasActiveTenantMembership) {
      throw new Error('hasActiveTenantMembership should not be called in this test')
    }

    return this.options.hasActiveTenantMembership()
  }

  protected override isSingleTenantMode(): boolean {
    return this.options.isSingleTenantMode ?? true
  }
}

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

function createContext(input: { authSession: AuthResult; cookie?: string; path: string }) {
  const redirects: string[] = []
  const { errors, logger, warnings } = createLogger()

  return {
    authSession: input.authSession,
    errors,
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
    warnings,
    workspaceShare: undefined,
  }
}

function createLogger() {
  const errors: { bindings: Record<string, unknown>; message: string }[] = []
  const warnings: { bindings: Record<string, unknown>; message: string }[] = []
  const debugs: { bindings: Record<string, unknown>; message: string }[] = []

  return {
    debugs,
    errors,
    logger: {
      debug(bindings: Record<string, unknown>, message: string) {
        debugs.push({ bindings, message })
      },
      error(bindings: Record<string, unknown>, message: string) {
        errors.push({ bindings, message })
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

  test('single-tenant mode forces the configured organization and synchronizes the session', async ({
    assert,
  }) => {
    const synchronized: string[] = []
    const db = {
      query: {
        organization: {
          findFirst: async () => ({
            id: 'org-single',
            logo: null,
            metadata: JSON.stringify({ workspaceKind: 'personal' }),
            name: 'Organization',
            slug: 'single-abc123',
          }),
        },
      },
      update() {
        return {
          set(payload: Record<string, unknown>) {
            assert.deepEqual(payload, { activeOrganizationId: 'org-single' })
            return {
              where() {
                synchronized.push('session-token')
                return Promise.resolve()
              },
            }
          },
        }
      },
    }
    app.container.bindValue('drizzle', db as unknown as AppDrizzleDb)

    let ensureCalled = 0
    const auth = {
      getSession: async () => createAuthSession('org-stale'),
    } satisfies Pick<AuthenticationPort, 'getSession'>

    const middleware = new SingleTenantTestMiddleware(auth as unknown as AuthenticationPort, {
      ensureSingleTenantMembership: async () => {
        ensureCalled += 1
      },
      hasActiveTenantMembership: async () => {
        throw new Error('membership check should be skipped in single-tenant mode')
      },
    })

    const ctx = createContext({
      authSession: createAuthSession('org-stale'),
      cookie: 'session-token',
      path: '/app/dashboard',
    })
    let nextCalled = false

    await middleware.handle(ctx as never, async () => {
      nextCalled = true
    })

    assert.isTrue(nextCalled)
    assert.equal(ensureCalled, 1)
    assert.equal(ctx.authSession.session.activeOrganizationId, 'org-single')
    assert.deepEqual(synchronized, ['session-token'])
    assert.deepEqual(ctx.redirects, [])
  })

  test('single-tenant mode logs a visible configuration error and clears the active organization', async ({
    assert,
  }) => {
    const db = {
      query: {
        organization: {
          findFirst: async () => null,
        },
      },
    }
    app.container.bindValue('drizzle', db as unknown as AppDrizzleDb)

    const auth = {
      getSession: async () => createAuthSession('org-stale'),
    } satisfies Pick<AuthenticationPort, 'getSession'>

    const middleware = new SingleTenantTestMiddleware(auth as unknown as AuthenticationPort, {
      getSingleTenantOrgId: () => {
        throw new Error('SINGLE_TENANT_ORG_ID must be set when TENANT_MODE=single')
      },
    })

    const ctx = createContext({
      authSession: createAuthSession('org-stale'),
      cookie: 'session-token',
      path: '/app/dashboard',
    })
    let nextCalled = false

    await middleware.handle(ctx as never, async () => {
      nextCalled = true
    })

    assert.isTrue(nextCalled)
    assert.isNull(ctx.authSession.session.activeOrganizationId)
    assert.deepEqual(ctx.redirects, [])
    assert.lengthOf(ctx.errors, 1)
    assert.equal(ctx.errors[0]!.message, 'single_tenant_configuration_invalid')
  })
})
