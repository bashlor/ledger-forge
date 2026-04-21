import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { AUTH_SESSION_TOKEN_COOKIE_NAME } from '#core/user_management/auth_session_cookie'
import {
  AuthenticationPort,
  type AuthProviderUser,
  type AuthResult,
} from '#core/user_management/domain/authentication'
import { member } from '#core/user_management/drizzle/schema'
import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'
import { and, eq } from 'drizzle-orm'

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
  owner: 'mbr_owner',
  regular: 'mbr_regular',
}

async function seedAllUsersAndMembers(db: PostgresJsDatabase<any>) {
  for (const user of [adminUser, ownerUser, regularMemberUser, anotherAdminUser]) {
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
    assert.includeMembers(ids, Object.values(MEMBER_IDS))
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
  })

  group.teardown(async () => cleanup())

  test('owner can deactivate a regular member', async ({ assert, client }) => {
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

  test('admin can deactivate a regular member', async ({ assert, client }) => {
    const response = await withCookie(
      client.patch(`/account/organizations/members/${MEMBER_IDS.regular}`),
      adminSession
    )
      .redirects(0)
      .form({ isActive: 'false' })

    response.assertStatus(302)

    const [row] = await db
      .select({ isActive: member.isActive })
      .from(member)
      .where(eq(member.id, MEMBER_IDS.regular))
    assert.isFalse(row.isActive)
  })

  test('owner can deactivate an admin', async ({ assert, client }) => {
    const response = await withCookie(
      client.patch(`/account/organizations/members/${MEMBER_IDS.admin}`),
      ownerSession
    )
      .redirects(0)
      .form({ isActive: 'false' })

    response.assertStatus(302)

    const [row] = await db
      .select({ isActive: member.isActive })
      .from(member)
      .where(eq(member.id, MEMBER_IDS.admin))
    assert.isFalse(row.isActive)
  })

  test('admin cannot deactivate another admin (redirects with flash error)', async ({
    assert,
    client,
  }) => {
    const response = await withCookie(
      client.patch(`/account/organizations/members/${MEMBER_IDS.anotherAdmin}`),
      adminSession
    )
      .redirects(0)
      .form({ isActive: 'false' })

    // flashAction catches forbidden DomainError → flashes + redirect
    response.assertStatus(302)

    // The target should remain active
    const [row] = await db
      .select({ isActive: member.isActive })
      .from(member)
      .where(eq(member.id, MEMBER_IDS.anotherAdmin))
    assert.isTrue(row.isActive)
  })

  test('cannot deactivate own membership (redirects with flash error)', async ({
    assert,
    client,
  }) => {
    const response = await withCookie(
      client.patch(`/account/organizations/members/${MEMBER_IDS.admin}`),
      adminSession
    )
      .redirects(0)
      .form({ isActive: 'false' })

    response.assertStatus(302)

    const [row] = await db
      .select({ isActive: member.isActive })
      .from(member)
      .where(eq(member.id, MEMBER_IDS.admin))
    assert.isTrue(row.isActive)
  })

  test('cannot deactivate the owner (redirects with flash error)', async ({ assert, client }) => {
    const response = await withCookie(
      client.patch(`/account/organizations/members/${MEMBER_IDS.owner}`),
      adminSession
    )
      .redirects(0)
      .form({ isActive: 'false' })

    response.assertStatus(302)

    const [row] = await db
      .select({ isActive: member.isActive })
      .from(member)
      .where(eq(member.id, MEMBER_IDS.owner))
    assert.isTrue(row.isActive)
  })

  test('regular member cannot toggle (redirects — forbidden flashed)', async ({
    assert,
    client,
  }) => {
    const response = await withCookie(
      client.patch(`/account/organizations/members/${MEMBER_IDS.regular}`),
      regularMemberSession
    )
      .redirects(0)
      .form({ isActive: 'false' })

    response.assertStatus(302)

    // Nothing changed
    const [row] = await db
      .select({ isActive: member.isActive })
      .from(member)
      .where(eq(member.id, MEMBER_IDS.regular))
    assert.isTrue(row.isActive)
  })

  test('missing target member returns 404 before authorization checks', async ({ client }) => {
    const response = await withCookie(
      client.patch('/account/organizations/members/nonexistent_id'),
      regularMemberSession
    )
      .redirects(0)
      .form({ isActive: 'false' })

    response.assertStatus(404)
  })

  test('unknown memberId returns 404 (not_found re-throws)', async ({ client }) => {
    const response = await withCookie(
      client.patch('/account/organizations/members/nonexistent_id'),
      ownerSession
    )
      .redirects(0)
      .form({ isActive: 'false' })

    response.assertStatus(404)
  })

  test('owner can re-activate a deactivated member', async ({ assert, client }) => {
    // First deactivate
    await db
      .update(member)
      .set({ isActive: false })
      .where(and(eq(member.id, MEMBER_IDS.regular), eq(member.organizationId, TEST_TENANT_ID)))

    const response = await withCookie(
      client.patch(`/account/organizations/members/${MEMBER_IDS.regular}`),
      ownerSession
    )
      .redirects(0)
      .form({ isActive: 'true' })

    response.assertStatus(302)

    const [row] = await db
      .select({ isActive: member.isActive })
      .from(member)
      .where(eq(member.id, MEMBER_IDS.regular))
    assert.isTrue(row.isActive)
  })

  test('unauthenticated PATCH is redirected to /signin', async ({ client }) => {
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
  })

  group.teardown(async () => cleanup())

  test('owner can promote a member to admin', async ({ assert, client }) => {
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

  test('owner can demote an admin to member', async ({ assert, client }) => {
    const response = await withCookie(
      client.patch(`/account/organizations/members/${MEMBER_IDS.admin}/role`),
      ownerSession
    )
      .redirects(0)
      .form({ role: 'member' })

    response.assertStatus(302)

    const [row] = await db
      .select({ role: member.role })
      .from(member)
      .where(eq(member.id, MEMBER_IDS.admin))
    assert.equal(row.role, 'member')
  })

  test('admin cannot change member roles', async ({ assert, client }) => {
    const response = await withCookie(
      client.patch(`/account/organizations/members/${MEMBER_IDS.regular}/role`),
      adminSession
    )
      .redirects(0)
      .form({ role: 'admin' })

    response.assertStatus(302)

    const [row] = await db
      .select({ role: member.role })
      .from(member)
      .where(eq(member.id, MEMBER_IDS.regular))
    assert.equal(row.role, 'member')
  })

  test('owner cannot promote a member to owner', async ({ assert, client }) => {
    const response = await withCookie(
      client.patch(`/account/organizations/members/${MEMBER_IDS.regular}/role`),
      ownerSession
    )
      .redirects(0)
      .form({ role: 'owner' })

    response.assertStatus(302)

    const [row] = await db
      .select({ role: member.role })
      .from(member)
      .where(eq(member.id, MEMBER_IDS.regular))
    assert.equal(row.role, 'member')
  })

  test('missing target member returns 404 before role authorization checks', async ({ client }) => {
    const response = await withCookie(
      client.patch('/account/organizations/members/nonexistent_id/role'),
      adminSession
    )
      .redirects(0)
      .form({ role: 'admin' })

    response.assertStatus(404)
  })
})
