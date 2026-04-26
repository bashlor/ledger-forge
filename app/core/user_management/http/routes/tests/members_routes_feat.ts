import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { auditEvents } from '#core/accounting/drizzle/schema'
import { AUTH_SESSION_TOKEN_COOKIE_NAME } from '#core/user_management/auth_session_cookie'
import {
  AuthenticationPort,
  type AuthProviderUser,
  type AuthResult,
} from '#core/user_management/domain/authentication'
import { member, organization } from '#core/user_management/drizzle/schema'
import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'
import { eq } from 'drizzle-orm'

import { withInertiaHeaders } from '../../../../../../tests/helpers/routes_test_support.js'
import {
  seedTestMember,
  seedTestOrganization,
  seedTestUser,
  setupTestDatabaseForGroup,
  TEST_TENANT_ID,
} from '../../../../../../tests/helpers/testcontainers_db.js'

// ---------------------------------------------------------------------------
// Users & sessions
// ---------------------------------------------------------------------------

const adminUser: AuthProviderUser = {
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  email: 'admin@example.com',
  emailVerified: true,
  id: 'user_members_admin',
  image: null,
  isAnonymous: false,
  name: 'Admin User',
  publicId: 'pub_user_members_admin',
}

const ownerUser: AuthProviderUser = {
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  email: 'owner@example.com',
  emailVerified: true,
  id: 'user_members_owner',
  image: null,
  isAnonymous: false,
  name: 'Owner User',
  publicId: 'pub_user_members_owner',
}

const regularMemberUser: AuthProviderUser = {
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  email: 'member@example.com',
  emailVerified: true,
  id: 'user_members_regular',
  image: null,
  isAnonymous: false,
  name: 'Regular Member',
  publicId: 'pub_user_members_regular',
}

const anotherAdminUser: AuthProviderUser = {
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  email: 'admin2@example.com',
  emailVerified: true,
  id: 'user_members_admin2',
  image: null,
  isAnonymous: false,
  name: 'Second Admin',
  publicId: 'pub_user_members_admin2',
}

function makeSession(user: AuthProviderUser): AuthResult {
  return {
    session: {
      activeOrganizationId: TEST_TENANT_ID,
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
      token: `token_${user.id}`,
      userId: user.id,
    },
    user,
  }
}

const adminSession = makeSession(adminUser)
const ownerSession = makeSession(ownerUser)
const regularMemberSession = makeSession(regularMemberUser)
const anotherAdminSession = makeSession(anotherAdminUser)

// ---------------------------------------------------------------------------
// Auth stub — returns the session matching the token
// ---------------------------------------------------------------------------

class MultiUserAuth extends AuthenticationPort {
  private sessions: AuthResult[]

  constructor(...sessions: AuthResult[]) {
    super()
    this.sessions = sessions
  }

  async changePassword(): Promise<void> {}
  getOAuthUrl(): string {
    return ''
  }
  async getSession(token: null | string): Promise<AuthResult | null> {
    return this.sessions.find((s) => s.session.token === token) ?? null
  }
  async getUserById(id: string): Promise<AuthProviderUser | null> {
    return this.sessions.find((s) => s.user.id === id)?.user ?? null
  }
  async requestPasswordReset(): Promise<void> {}
  async resetPassword(): Promise<void> {}
  async sendVerificationEmail(): Promise<void> {}
  async signIn(): Promise<AuthResult> {
    return adminSession
  }
  async signInAnonymously(): Promise<AuthResult> {
    return adminSession
  }
  async signOut(): Promise<void> {}
  async signUp(): Promise<AuthResult> {
    return adminSession
  }
  async updateUser(): Promise<AuthProviderUser> {
    return adminUser
  }
  async validateSession(): Promise<AuthResult> {
    return adminSession
  }
  async verifyEmail(): Promise<void> {}
}

function withCookie(request: any, session: AuthResult) {
  return request.cookie(AUTH_SESSION_TOKEN_COOKIE_NAME, session.session.token)
}

// ---------------------------------------------------------------------------
// Helpers to seed stable test fixtures
// ---------------------------------------------------------------------------

const MEMBER_IDS = {
  admin: 'mbr_admin',
  anotherAdmin: 'mbr_another_admin',
  crossTenant: 'mbr_cross_tenant',
  owner: 'mbr_owner',
  regular: 'mbr_regular',
}
const OTHER_TENANT_ID = 'test_org_other'
const crossTenantUser: AuthProviderUser = {
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  email: 'cross-tenant@example.com',
  emailVerified: true,
  id: 'user_members_cross_tenant',
  image: null,
  isAnonymous: false,
  name: 'Cross Tenant User',
  publicId: 'pub_user_members_cross_tenant',
}

async function seedAllUsersAndMembers(db: PostgresJsDatabase<any>) {
  for (const user of [adminUser, ownerUser, regularMemberUser, anotherAdminUser, crossTenantUser]) {
    await seedTestUser(db, {
      email: user.email,
      id: user.id,
      name: user.name!,
      publicId: user.publicId,
    })
  }
  await seedTestMember(db, {
    id: MEMBER_IDS.owner,
    organizationId: TEST_TENANT_ID,
    role: 'owner',
    userId: ownerUser.id,
  })
  await seedTestMember(db, {
    id: MEMBER_IDS.admin,
    organizationId: TEST_TENANT_ID,
    role: 'admin',
    userId: adminUser.id,
  })
  await seedTestMember(db, {
    id: MEMBER_IDS.anotherAdmin,
    organizationId: TEST_TENANT_ID,
    role: 'admin',
    userId: anotherAdminUser.id,
  })
  await seedTestMember(db, {
    id: MEMBER_IDS.regular,
    organizationId: TEST_TENANT_ID,
    role: 'member',
    userId: regularMemberUser.id,
  })
  await db.insert(organization).values({
    id: OTHER_TENANT_ID,
    name: 'Other Test Organization',
    slug: 'other-test-org',
  })
  await seedTestMember(db, {
    id: MEMBER_IDS.crossTenant,
    organizationId: OTHER_TENANT_ID,
    role: 'member',
    userId: crossTenantUser.id,
  })
}

// ---------------------------------------------------------------------------
// Tests: GET /account/organizations/members
// ---------------------------------------------------------------------------

test.group('Members routes | GET /account/organizations/members', (group) => {
  let cleanup: () => Promise<void>
  let db: PostgresJsDatabase<any>

  group.setup(async () => {
    const ctx = await setupTestDatabaseForGroup()
    cleanup = ctx.cleanup
    db = await app.container.make('drizzle')
    await seedTestOrganization(db)
    await seedAllUsersAndMembers(db)

    const auth = new MultiUserAuth(
      adminSession,
      ownerSession,
      regularMemberSession,
      anotherAdminSession
    )
    app.container.bindValue(AuthenticationPort, auth)
    app.container.bindValue('authAdapter', auth)
  })

  group.teardown(async () => cleanup())

  test('admin can list members (200 JSON)', async ({ assert, client }) => {
    const response = await withCookie(client.get('/account/organizations/members'), adminSession)

    response.assertStatus(200)
    const body = response.body() as any[]
    assert.isArray(body)
    assert.equal(body.length, 4)
    const ids = body.map((m: any) => m.id)
    assert.includeMembers(ids, [
      MEMBER_IDS.owner,
      MEMBER_IDS.admin,
      MEMBER_IDS.anotherAdmin,
      MEMBER_IDS.regular,
    ])
  })

  test('owner can list members (200 JSON)', async ({ assert, client }) => {
    const response = await withCookie(client.get('/account/organizations/members'), ownerSession)

    response.assertStatus(200)
    const body = response.body() as any[]
    assert.isArray(body)
    assert.equal(body.length, 4)
  })

  test('regular member is forbidden — global handler returns 403', async ({ client }) => {
    const response = await withCookie(
      client.get('/account/organizations/members'),
      regularMemberSession
    ).redirects(0)

    // DomainError(forbidden) bubbles to the global handler → HttpProblem → 403 status page
    response.assertStatus(403)
  })

  test('unauthenticated request is redirected to /signin', async ({ client }) => {
    const response = await client.get('/account/organizations/members').redirects(0)
    response.assertStatus(302)
    response.assertHeader('location', '/signin')
  })
})

test.group('Organization page route | GET /organization', (group) => {
  let cleanup: () => Promise<void>
  let db: PostgresJsDatabase<any>

  group.setup(async () => {
    const ctx = await setupTestDatabaseForGroup()
    cleanup = ctx.cleanup
    db = await app.container.make('drizzle')
    await seedTestOrganization(db)
    await seedAllUsersAndMembers(db)

    const auth = new MultiUserAuth(
      adminSession,
      ownerSession,
      regularMemberSession,
      anotherAdminSession
    )
    app.container.bindValue(AuthenticationPort, auth)
    app.container.bindValue('authAdapter', auth)
  })

  group.each.setup(async () => {
    await db.delete(auditEvents)
  })

  group.teardown(async () => cleanup())

  test('owner can view organization members and tenant audit', async ({ assert, client }) => {
    await db.insert(auditEvents).values({
      action: 'member_role_changed',
      actorId: ownerUser.id,
      changes: { after: { role: 'admin' }, before: { role: 'member' } },
      createdAt: new Date('2026-04-20T10:00:00.000Z'),
      entityId: MEMBER_IDS.regular,
      entityType: 'member',
      id: 'audit_org_page_owner',
      metadata: { result: 'success' },
      organizationId: TEST_TENANT_ID,
    })

    const response = await withCookie(withInertiaHeaders(client.get('/organization')), ownerSession)

    response.assertStatus(200)
    assert.equal(response.body().component, 'app/organization')
    assert.lengthOf(response.body().props.members, 4)
    assert.isTrue(response.body().props.canViewAuditTrail)
    assert.lengthOf(response.body().props.auditEvents, 1)
    assert.equal(response.body().props.auditEvents[0].action, 'member_role_changed')
  })

  test('admin can view the organization page', async ({ assert, client }) => {
    const response = await withCookie(withInertiaHeaders(client.get('/organization')), adminSession)

    response.assertStatus(200)
    assert.equal(response.body().component, 'app/organization')
    assert.lengthOf(response.body().props.members, 4)
    assert.isTrue(response.body().props.canViewAuditTrail)
  })

  test('regular member is forbidden', async ({ client }) => {
    const response = await withCookie(
      withInertiaHeaders(client.get('/organization')),
      regularMemberSession
    ).redirects(0)

    response.assertStatus(403)
  })
})

// ---------------------------------------------------------------------------
// Tests: PATCH /account/organizations/members/:memberId
// ---------------------------------------------------------------------------

test.group('Members routes | PATCH toggle active', (group) => {
  let cleanup: () => Promise<void>
  let db: PostgresJsDatabase<any>

  group.setup(async () => {
    const ctx = await setupTestDatabaseForGroup()
    cleanup = ctx.cleanup
    db = await app.container.make('drizzle')
    await seedTestOrganization(db)
    await seedAllUsersAndMembers(db)

    const auth = new MultiUserAuth(
      adminSession,
      ownerSession,
      regularMemberSession,
      anotherAdminSession
    )
    app.container.bindValue(AuthenticationPort, auth)
    app.container.bindValue('authAdapter', auth)
  })

  group.each.setup(async () => {
    // Reset all members to active after each test
    await db.update(member).set({ isActive: true })
    await db.update(member).set({ role: 'admin' }).where(eq(member.id, MEMBER_IDS.admin))
    await db.update(member).set({ role: 'admin' }).where(eq(member.id, MEMBER_IDS.anotherAdmin))
    await db.update(member).set({ role: 'member' }).where(eq(member.id, MEMBER_IDS.regular))
    await db.delete(auditEvents)
  })

  group.teardown(async () => cleanup())

  test('contract: PATCH /members/:id returns redirect on success', async ({ assert, client }) => {
    const response = await withCookie(
      client.patch(`/account/organizations/members/${MEMBER_IDS.regular}`),
      ownerSession
    )
      .redirects(0)
      .form({ isActive: 'false' })

    response.assertStatus(302)
    response.assertHeader('location', '/account/organizations/members')

    const [row] = await db
      .select({ isActive: member.isActive })
      .from(member)
      .where(eq(member.id, MEMBER_IDS.regular))
    assert.isFalse(row.isActive)
  })

  test('contract: cross-tenant member id returns 404', async ({ assert, client }) => {
    const response = await withCookie(
      client.patch(`/account/organizations/members/${MEMBER_IDS.crossTenant}`),
      ownerSession
    )
      .redirects(0)
      .form({ isActive: 'false' })

    response.assertStatus(404)

    const [row] = await db
      .select({ isActive: member.isActive, organizationId: member.organizationId })
      .from(member)
      .where(eq(member.id, MEMBER_IDS.crossTenant))
    assert.equal(row.organizationId, OTHER_TENANT_ID)
    assert.isTrue(row.isActive)
  })

  test('contract: unauthenticated PATCH is redirected to /signin', async ({ client }) => {
    const response = await client
      .patch(`/account/organizations/members/${MEMBER_IDS.regular}`)
      .redirects(0)
      .form({ isActive: 'false' })

    response.assertStatus(302)
    response.assertHeader('location', '/signin')
  })
})

test.group('Members routes | PATCH update role', (group) => {
  let cleanup: () => Promise<void>
  let db: PostgresJsDatabase<any>

  group.setup(async () => {
    const ctx = await setupTestDatabaseForGroup()
    cleanup = ctx.cleanup
    db = await app.container.make('drizzle')
    await seedTestOrganization(db)
    await seedAllUsersAndMembers(db)

    const auth = new MultiUserAuth(
      adminSession,
      ownerSession,
      regularMemberSession,
      anotherAdminSession
    )
    app.container.bindValue(AuthenticationPort, auth)
    app.container.bindValue('authAdapter', auth)
  })

  group.each.setup(async () => {
    await db.update(member).set({ isActive: true })
    await db.update(member).set({ role: 'owner' }).where(eq(member.id, MEMBER_IDS.owner))
    await db.update(member).set({ role: 'admin' }).where(eq(member.id, MEMBER_IDS.admin))
    await db.update(member).set({ role: 'admin' }).where(eq(member.id, MEMBER_IDS.anotherAdmin))
    await db.update(member).set({ role: 'member' }).where(eq(member.id, MEMBER_IDS.regular))
    await db.delete(auditEvents)
  })

  group.teardown(async () => cleanup())

  test('contract: PATCH /members/:id/role returns redirect on success', async ({
    assert,
    client,
  }) => {
    const response = await withCookie(
      client.patch(`/account/organizations/members/${MEMBER_IDS.regular}/role`),
      ownerSession
    )
      .redirects(0)
      .form({ role: 'admin' })

    response.assertStatus(302)

    const [row] = await db
      .select({ role: member.role })
      .from(member)
      .where(eq(member.id, MEMBER_IDS.regular))
    assert.equal(row.role, 'admin')
  })

  test('contract: cross-tenant role update returns 404', async ({ assert, client }) => {
    const response = await withCookie(
      client.patch(`/account/organizations/members/${MEMBER_IDS.crossTenant}/role`),
      ownerSession
    )
      .redirects(0)
      .form({ role: 'admin' })

    response.assertStatus(404)

    const [row] = await db
      .select({ organizationId: member.organizationId, role: member.role })
      .from(member)
      .where(eq(member.id, MEMBER_IDS.crossTenant))
    assert.equal(row.organizationId, OTHER_TENANT_ID)
    assert.equal(row.role, 'member')
  })
})
