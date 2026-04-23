import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import * as schema from '#core/common/drizzle/index'
import { DomainError } from '#core/common/errors/domain_error'
import { AuthorizationService } from '#core/user_management/application/authorization_service'
import { DevOperatorBootstrapService } from '#core/user_management/application/dev_operator_bootstrap_service'
import { DevToolsEnvironmentService } from '#core/user_management/application/dev_tools_environment_service'
import { AUTH_SESSION_TOKEN_COOKIE_NAME } from '#core/user_management/auth_session_cookie'
import {
  AuthenticationPort,
  type AuthProviderUser,
  type AuthResult,
} from '#core/user_management/domain/authentication'
import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'
import { eq } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'

import { setupIsolatedTestDatabaseForGroup } from '../../../../../tests/helpers/testcontainers_db.js'
import { inertiaHeaders } from './invoices_test_support.js'

class DevOperatorAccessAuth extends AuthenticationPort {
  constructor(private readonly db: PostgresJsDatabase<typeof schema>) {
    super()
  }

  async changePassword(): Promise<void> {}
  getOAuthUrl(): string {
    return ''
  }

  async getSession(token: null | string): Promise<AuthResult | null> {
    if (!token) {
      return null
    }

    const [row] = await this.db
      .select({
        activeOrganizationId: schema.session.activeOrganizationId,
        createdAt: schema.user.createdAt,
        email: schema.user.email,
        emailVerified: schema.user.emailVerified,
        expiresAt: schema.session.expiresAt,
        id: schema.user.id,
        image: schema.user.image,
        isAnonymous: schema.user.isAnonymous,
        name: schema.user.name,
        publicId: schema.user.publicId,
        userId: schema.session.userId,
      })
      .from(schema.session)
      .innerJoin(schema.user, eq(schema.session.userId, schema.user.id))
      .where(eq(schema.session.token, token))
      .limit(1)

    if (!row) {
      return null
    }

    return {
      session: {
        activeOrganizationId: row.activeOrganizationId,
        expiresAt: row.expiresAt,
        token,
        userId: row.userId,
      },
      user: {
        createdAt: row.createdAt,
        email: row.email,
        emailVerified: row.emailVerified,
        id: row.id,
        image: row.image,
        isAnonymous: row.isAnonymous,
        name: row.name,
        publicId: row.publicId,
      },
    }
  }

  async getUserById(userId: string): Promise<AuthProviderUser | null> {
    const [row] = await this.db
      .select({
        createdAt: schema.user.createdAt,
        email: schema.user.email,
        emailVerified: schema.user.emailVerified,
        id: schema.user.id,
        image: schema.user.image,
        isAnonymous: schema.user.isAnonymous,
        name: schema.user.name,
        publicId: schema.user.publicId,
      })
      .from(schema.user)
      .where(eq(schema.user.id, userId))
      .limit(1)

    return row ?? null
  }

  async requestPasswordReset(): Promise<void> {}
  async resetPassword(): Promise<void> {}
  async sendVerificationEmail(): Promise<void> {}

  async signIn(email: string): Promise<AuthResult> {
    return this.issueSession(email)
  }

  async signInAnonymously(): Promise<AuthResult> {
    throw new Error('Anonymous sign-in is not used in dev operator access tests')
  }

  async signOut(): Promise<void> {}

  async signUp(email: string, _password: string, name?: string): Promise<AuthResult> {
    return this.issueSession(email, name ?? undefined)
  }

  async updateUser(): Promise<AuthProviderUser> {
    throw new Error('updateUser is not used in dev operator access tests')
  }

  async validateSession(token: string): Promise<AuthResult> {
    const session = await this.getSession(token)
    if (!session) {
      throw new Error('Session not found')
    }
    return session
  }

  async verifyEmail(): Promise<void> {}

  private async issueSession(email: string, name?: string): Promise<AuthResult> {
    const normalizedEmail = email.trim().toLowerCase()
    const [existing] = await this.db
      .select({
        createdAt: schema.user.createdAt,
        email: schema.user.email,
        emailVerified: schema.user.emailVerified,
        id: schema.user.id,
        image: schema.user.image,
        isAnonymous: schema.user.isAnonymous,
        name: schema.user.name,
        publicId: schema.user.publicId,
      })
      .from(schema.user)
      .where(eq(schema.user.email, normalizedEmail))
      .limit(1)

    const insertedUsers = existing
      ? null
      : await this.db
          .insert(schema.user)
          .values({
            email: normalizedEmail,
            id: uuidv7(),
            name: name ?? normalizedEmail,
            publicId: `pub_${uuidv7().replaceAll('-', '')}`,
          })
          .returning({
            createdAt: schema.user.createdAt,
            email: schema.user.email,
            emailVerified: schema.user.emailVerified,
            id: schema.user.id,
            image: schema.user.image,
            isAnonymous: schema.user.isAnonymous,
            name: schema.user.name,
            publicId: schema.user.publicId,
          })

    const user = existing ?? insertedUsers?.[0]

    if (!user) {
      throw new Error('Could not persist dev operator access test user')
    }

    return {
      session: {
        activeOrganizationId: null,
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
        token: `dev-access-${uuidv7()}`,
        userId: user.id,
      },
      user,
    }
  }
}

test.group('Dev operator access routes', (group) => {
  let cleanup: () => Promise<void>
  let db: PostgresJsDatabase<typeof schema>

  group.setup(async () => {
    const ctx = await setupIsolatedTestDatabaseForGroup()
    cleanup = ctx.cleanup
    db = await app.container.make('drizzle')
  })

  group.each.setup(async () => {
    app.container.restore(AuthenticationPort)
    app.container.restore('authAdapter' as any)
    app.container.restore(DevOperatorBootstrapService)

    const auth = new DevOperatorAccessAuth(db)
    app.container.bindValue(AuthenticationPort, auth)
    app.container.bindValue('authAdapter', auth)

    app.container.swap(AuthorizationService, async () => {
      return new AuthorizationService(db, true)
    })

    app.container.swap(DevToolsEnvironmentService, async () => {
      return new DevToolsEnvironmentService(true)
    })

    await db.delete(schema.devOperatorAccess)
    await db.delete(schema.member)
    await db.delete(schema.session)
    await db.delete(schema.organization)
    await db.delete(schema.user)
  })

  group.each.teardown(() => {
    app.container.restore(AuthenticationPort)
    app.container.restore('authAdapter' as any)
    app.container.restore(AuthorizationService)
    app.container.restore(DevOperatorBootstrapService)
    app.container.restore(DevToolsEnvironmentService)
  })

  group.teardown(async () => cleanup())

  test('GET /_dev/access renders the local bootstrap page when dev tools are enabled', async ({
    assert,
    client,
  }) => {
    const response = await inertiaHeaders(client.get('/_dev/access')).redirects(0)

    response.assertStatus(200)
    assert.equal(response.body().component, 'dev/access')
    assert.equal(response.body().props.bootstrap.defaults.email, 'dev-operator@example.local')
  })

  test('GET /_dev redirects to the inspector when the signed-in user already has dev operator access', async ({
    assert,
    client,
  }) => {
    const created = await db
      .insert(schema.user)
      .values({
        email: 'signed-dev@example.local',
        id: uuidv7(),
        name: 'Signed Dev Operator',
        publicId: `pub_${uuidv7().replaceAll('-', '')}`,
      })
      .returning({ id: schema.user.id })
    const userId = created[0]!.id
    const sessionToken = `dev-access-${uuidv7()}`

    await db.insert(schema.devOperatorAccess).values({ userId })
    await db.insert(schema.session).values({
      activeOrganizationId: null,
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
      id: uuidv7(),
      token: sessionToken,
      userId,
    })

    const response = await client
      .get('/_dev')
      .cookie(AUTH_SESSION_TOKEN_COOKIE_NAME, sessionToken)
      .redirects(0)

    response.assertStatus(302)
    assert.equal(response.header('location'), '/_dev/inspector')
  })

  test('POST /_dev/access provisions a dev operator and opens the inspector', async ({
    assert,
    client,
  }) => {
    const response = await client.post('/_dev/access').redirects(0).form({
      email: 'local-dev@example.local',
      fullName: 'Local Dev Operator',
      password: 'SecureP@ss123',
      passwordConfirmation: 'SecureP@ss123',
    })

    response.assertStatus(302)
    response.assertHeader('location', '/_dev/inspector')

    const [user] = await db
      .select({ email: schema.user.email, id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.email, 'local-dev@example.local'))
      .limit(1)

    assert.exists(user)
    const [grant] = await db
      .select({ userId: schema.devOperatorAccess.userId })
      .from(schema.devOperatorAccess)
      .where(eq(schema.devOperatorAccess.userId, user!.id))
      .limit(1)

    assert.equal(grant?.userId, user?.id)

    const cookieHeader = cookieHeaderFromRouteResponse(response.headers()['set-cookie'])
    const inspectorResponse = await inertiaHeaders(client.get('/_dev/inspector'))
      .header('cookie', cookieHeader)
      .redirects(0)

    inspectorResponse.assertStatus(200)
    assert.equal(inspectorResponse.body().component, 'dev/inspector')
    assert.equal(inspectorResponse.body().props.inspector.context.readOnlyBadge, 'Read-Only Access')
    assert.equal(
      inspectorResponse.body().props.inspector.context.userEmail,
      'local-dev@example.local'
    )

    const [persistedSession] = await db
      .select({ activeOrganizationId: schema.session.activeOrganizationId })
      .from(schema.session)
      .where(eq(schema.session.userId, user!.id))
      .limit(1)

    assert.exists(persistedSession?.activeOrganizationId)

    const tenantMemberships = await db
      .select({
        role: schema.member.role,
        userId: schema.member.userId,
      })
      .from(schema.member)
      .where(eq(schema.member.organizationId, persistedSession!.activeOrganizationId!))

    assert.lengthOf(tenantMemberships, 1)
    assert.equal(tenantMemberships[0]?.userId, user!.id)
    assert.equal(tenantMemberships[0]?.role, 'owner')
  })

  test('POST /_dev/access does not retry bootstrap after a failure', async ({ assert, client }) => {
    let bootstrapCalls = 0

    app.container.swap(DevOperatorBootstrapService, async () => {
      const bootstrapService = new DevOperatorBootstrapService(db)
      bootstrapService.bootstrap = async () => {
        bootstrapCalls += 1
        throw new DomainError('Bootstrap failed.', 'business_logic_error')
      }
      bootstrapService.defaults = () => ({
        email: 'dev-operator@example.local',
        fullName: 'Dev Operator',
        password: 'password',
      })

      return bootstrapService
    })

    const response = await client.post('/_dev/access').redirects(0).form({
      email: 'local-dev@example.local',
      fullName: 'Local Dev Operator',
      password: 'SecureP@ss123',
      passwordConfirmation: 'SecureP@ss123',
    })

    response.assertStatus(302)
    response.assertHeader('location', '/_dev/access')
    assert.equal(bootstrapCalls, 1)
  })

  test('dev operator direct accounting access stays forbidden even with an owner membership', async ({
    client,
  }) => {
    const userId = uuidv7()
    const organizationId = uuidv7()
    const sessionToken = `dev-access-${uuidv7()}`

    await db.insert(schema.user).values({
      email: 'dev-owner@example.local',
      id: userId,
      name: 'Dev Owner',
      publicId: `pub_${uuidv7().replaceAll('-', '')}`,
    })
    await db.insert(schema.organization).values({
      id: organizationId,
      name: 'Dev Owner Tenant',
      slug: `dev-owner-${uuidv7().slice(0, 8)}`,
    })
    await db.insert(schema.member).values({
      id: uuidv7(),
      organizationId,
      role: 'owner',
      userId,
    })
    await db.insert(schema.devOperatorAccess).values({ userId })
    await db.insert(schema.session).values({
      activeOrganizationId: organizationId,
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
      id: uuidv7(),
      token: sessionToken,
      userId,
    })

    const response = await inertiaHeaders(client.get('/dashboard'))
      .cookie(AUTH_SESSION_TOKEN_COOKIE_NAME, sessionToken)
      .redirects(0)

    response.assertStatus(403)
  })
})

function cookieHeaderFromRouteResponse(value: null | string | string[] | undefined): string {
  const list = Array.isArray(value) ? value : value ? [value] : []
  return list
    .map((cookie) => cookie.split(';')[0]?.trim())
    .filter(Boolean)
    .join('; ')
}
