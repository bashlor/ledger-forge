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
      ensureSingleTenantMembership?: () => Promise<{
        organizationId: string
        wasProvisioned: boolean
      }>
      getSingleTenantOrgId?: () => string
      hasActiveTenantMembership?: () => Promise<boolean>
      isSingleTenantMode?: boolean
      seedWorkspaceDemoData?: () => Promise<boolean>
    } = {}
  ) {
    super(auth)
  }

  protected override async ensureSingleTenantMembership(): Promise<{
    organizationId: string
    wasProvisioned: boolean
  }> {
    return (
      (await this.options.ensureSingleTenantMembership?.()) ?? {
        organizationId: this.getSingleTenantOrgId(),
        wasProvisioned: false,
      }
    )
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

  protected override async seedWorkspaceDemoData(): Promise<boolean> {
    return (await this.options.seedWorkspaceDemoData?.()) ?? false
  }
}

class WorkspaceTestMiddleware extends WorkspaceShareMiddleware {
  constructor(
    auth: AuthenticationPort,
    private readonly options: {
      ensureSingleTenantMembership?: () => Promise<{
        organizationId: string
        wasProvisioned: boolean
      }>
      getSingleTenantOrgId?: () => string
      hasActiveTenantMembership?: () => Promise<boolean>
      isSingleTenantMode?: boolean
      provisionPersonalWorkspace?: () => Promise<{
        organizationId: null | string
        wasProvisioned: boolean
      }>
      seedWorkspaceDemoData?: () => Promise<boolean>
    } = {}
  ) {
    super(auth)
  }

  protected override async ensureSingleTenantMembership(): Promise<{
    organizationId: string
    wasProvisioned: boolean
  }> {
    return (
      (await this.options.ensureSingleTenantMembership?.()) ?? {
        organizationId: this.getSingleTenantOrgId(),
        wasProvisioned: false,
      }
    )
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

  protected override async provisionPersonalWorkspace(): Promise<{
    organizationId: null | string
    wasProvisioned: boolean
  }> {
    if (!this.options.provisionPersonalWorkspace) {
      throw new Error('provisionPersonalWorkspace should not be called in this test')
    }

    return this.options.provisionPersonalWorkspace()
  }

  protected override async seedWorkspaceDemoData(): Promise<boolean> {
    return (await this.options.seedWorkspaceDemoData?.()) ?? false
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

function createContext(input: {
  accept?: string
  authSession: AuthResult
  cookie?: string
  path: string
}) {
  const redirects: string[] = []
  const jsonResponses: unknown[] = []
  const headers: Record<string, string> = {}
  let responseStatus: null | number = null
  const { errors, logger, warnings } = createLogger()

  return {
    authSession: input.authSession,
    errors,
    headers,
    jsonResponses,
    logger,
    redirects,
    request: {
      cookie() {
        return input.cookie ?? null
      },
      header(name: string) {
        if (name.toLowerCase() === 'accept') {
          return input.accept ?? null
        }
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
      header(key: string, value: string) {
        headers[key] = value
      },
      json(payload: unknown) {
        jsonResponses.push(payload)
      },
      redirect(path: string) {
        redirects.push(path)
        return path
      },
      status(code: number) {
        responseStatus = code
      },
    },
    responseStatus() {
      return responseStatus
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

  test('returns a problem+json response when no active organization is available for JSON clients', async ({
    assert,
  }) => {
    app.container.bindValue('drizzle', {} as unknown as AppDrizzleDb)

    const auth = {
      getSession: async () => createAuthSession(null),
    } satisfies Pick<AuthenticationPort, 'getSession'>

    const middleware = new WorkspaceShareMiddleware(auth as unknown as AuthenticationPort)
    const ctx = createContext({
      accept: 'application/json',
      authSession: createAuthSession(null),
      path: '/dashboard',
    })
    let nextCalled = false

    await middleware.handle(ctx as never, async () => {
      nextCalled = true
    })

    assert.isFalse(nextCalled)
    assert.equal(ctx.responseStatus(), 401)
    assert.equal(ctx.headers['Content-Type'], 'application/problem+json')
    assert.deepEqual(ctx.jsonResponses[0], {
      code: 'auth.active_workspace_required',
      detail: 'An active workspace is required for this request.',
      instance: undefined,
      status: 401,
      title: 'Unauthorized',
      type: 'urn:accounting-app:error:active-workspace-required',
    })
    assert.deepEqual(ctx.redirects, [])
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
    const seeded: string[] = []
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
        return { organizationId: 'org-single', wasProvisioned: true }
      },
      hasActiveTenantMembership: async () => {
        throw new Error('membership check should be skipped in single-tenant mode')
      },
      seedWorkspaceDemoData: async () => {
        seeded.push('org-single')
        return true
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
    assert.deepEqual(seeded, ['org-single'])
    assert.deepEqual(ctx.redirects, [])
  })

  test('single-tenant mode keeps the active organization when demo seeding fails', async ({
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

    const auth = {
      getSession: async () => createAuthSession('org-stale'),
    } satisfies Pick<AuthenticationPort, 'getSession'>

    const middleware = new WorkspaceTestMiddleware(auth as unknown as AuthenticationPort, {
      ensureSingleTenantMembership: async () => ({
        organizationId: 'org-single',
        wasProvisioned: true,
      }),
      seedWorkspaceDemoData: async () => {
        throw new Error('seed exploded')
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
    assert.equal(ctx.authSession.session.activeOrganizationId, 'org-single')
    assert.deepEqual(synchronized, ['session-token'])
    assert.deepEqual(ctx.redirects, [])
    assert.lengthOf(ctx.warnings, 1)
    assert.deepInclude(ctx.warnings[0]!.bindings, {
      entityId: 'org-single',
      entityType: 'workspace',
      event: 'single_workspace_demo_seed_failure',
      level: 'warn',
      outcome: 'failure',
    })
  })

  test('personal workspace mode keeps the provisioned active organization when demo seeding fails', async ({
    assert,
  }) => {
    app.container.bindValue('drizzle', {
      query: {
        organization: {
          findFirst: async () => ({
            id: 'org-personal',
            logo: null,
            metadata: JSON.stringify({ workspaceKind: 'personal' }),
            name: 'User workspace',
            slug: 'user-workspace',
          }),
        },
      },
    } as unknown as AppDrizzleDb)

    const auth = {
      getSession: async (token: null | string) => {
        assert.equal(token, 'session-token')
        return createAuthSession('org-personal')
      },
    } satisfies Pick<AuthenticationPort, 'getSession'>

    const middleware = new WorkspaceTestMiddleware(auth as unknown as AuthenticationPort, {
      hasActiveTenantMembership: async () => true,
      isSingleTenantMode: false,
      provisionPersonalWorkspace: async () => ({
        organizationId: 'org-personal',
        wasProvisioned: true,
      }),
      seedWorkspaceDemoData: async () => {
        throw new Error('seed exploded')
      },
    })

    const ctx = createContext({
      authSession: createAuthSession(null),
      cookie: 'session-token',
      path: '/app/dashboard',
    })
    let nextCalled = false

    await middleware.handle(ctx as never, async () => {
      nextCalled = true
    })

    assert.isTrue(nextCalled)
    assert.equal(ctx.authSession.session.activeOrganizationId, 'org-personal')
    assert.deepEqual(ctx.redirects, [])
    assert.lengthOf(ctx.warnings, 1)
    assert.deepInclude(ctx.warnings[0]!.bindings, {
      entityId: 'org-personal',
      entityType: 'workspace',
      event: 'personal_workspace_demo_seed_failure',
      level: 'warn',
      outcome: 'failure',
    })
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
    assert.deepInclude(ctx.errors[0]!.bindings, {
      entityId: 'unknown',
      entityType: 'workspace',
      event: 'single_tenant_configuration_invalid',
      level: 'error',
      outcome: 'failure',
    })
  })
})
