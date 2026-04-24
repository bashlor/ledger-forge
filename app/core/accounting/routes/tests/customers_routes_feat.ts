import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { auditEvents, customers, invoices, journalEntries } from '#core/accounting/drizzle/schema'
import { AUTH_SESSION_TOKEN_COOKIE_NAME } from '#core/user_management/auth_session_cookie'
import {
  AuthenticationPort,
  type AuthProviderUser,
  type AuthResult,
} from '#core/user_management/domain/authentication'
import { member } from '#core/user_management/drizzle/schema'
import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'
import { eq } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'

import {
  seedTestMember,
  seedTestOrganization,
  seedTestUser,
  setupTestDatabaseForGroup,
  TEST_TENANT_ID,
} from '../../../../../tests/helpers/testcontainers_db.js'

const fakeUser: AuthProviderUser = {
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  email: 'test@example.com',
  emailVerified: true,
  id: 'accounting_test_customers_user',
  image: null,
  isAnonymous: false,
  name: 'Test User',
  publicId: 'pub_accounting_test_customers_user',
}

const fakeSession: AuthResult = {
  session: {
    activeOrganizationId: TEST_TENANT_ID,
    expiresAt: new Date('2030-01-01T00:00:00.000Z'),
    token: 'test_session_token_customers',
    userId: fakeUser.id,
  },
  user: fakeUser,
}

class FakeAuth extends AuthenticationPort {
  async changePassword(): Promise<void> {}
  getOAuthUrl(): string {
    return ''
  }
  async getSession(token: null | string): Promise<AuthResult | null> {
    return token === fakeSession.session.token ? fakeSession : null
  }
  async getUserById(): Promise<AuthProviderUser | null> {
    return fakeUser
  }
  async requestPasswordReset(): Promise<void> {}
  async resetPassword(): Promise<void> {}
  async sendVerificationEmail(): Promise<void> {}
  async signIn(): Promise<AuthResult> {
    return fakeSession
  }
  async signInAnonymously(): Promise<AuthResult> {
    return fakeSession
  }
  async signOut(): Promise<void> {}
  async signUp(): Promise<AuthResult> {
    return fakeSession
  }
  async updateUser(): Promise<AuthProviderUser> {
    return fakeUser
  }
  async validateSession(): Promise<AuthResult> {
    return fakeSession
  }
  async verifyEmail(): Promise<void> {}
}

let db: PostgresJsDatabase<any>

function assertRedirectQuery(
  assert: any,
  locationHeader: null | string,
  expected: Record<string, string>
) {
  const location = new URL(`http://localhost${locationHeader ?? ''}`)
  assert.equal(location.pathname, '/customers')
  for (const [key, value] of Object.entries(expected)) {
    assert.equal(location.searchParams.get(key), value)
  }
}

function inertiaGet(client: any, url: string) {
  return inertiaHeaders(withAuthCookie(client.get(url)))
}

function inertiaHeaders(request: any) {
  request.header('x-inertia', 'true')
  request.header('x-inertia-version', '1')
  return request
}

function withAuthCookie(request: any) {
  request.cookie(AUTH_SESSION_TOKEN_COOKIE_NAME, fakeSession.session.token)
  return request
}

test.group('Customers routes | boundary contract', (group) => {
  let cleanup: () => Promise<void>

  group.setup(async () => {
    const ctx = await setupTestDatabaseForGroup()
    cleanup = ctx.cleanup
    db = await app.container.make('drizzle')
    await seedTestOrganization(db)
    await seedTestUser(db, {
      email: fakeUser.email,
      id: fakeUser.id,
      name: fakeUser.name!,
      publicId: fakeUser.publicId,
    })
    await seedTestMember(db, {
      id: 'member_test_customers_actor',
      organizationId: TEST_TENANT_ID,
      role: 'member',
      userId: fakeUser.id,
    })

    const auth = new FakeAuth()
    app.container.bindValue(AuthenticationPort, auth)
    app.container.bindValue('authAdapter', auth)
  })

  group.each.setup(async () => {
    await db.delete(auditEvents)
    await db.delete(journalEntries)
    await db.delete(invoices)
    await db.delete(customers)
    await db.update(member).set({ isActive: true }).where(eq(member.userId, fakeUser.id))
  })

  group.teardown(async () => cleanup())

  test('contract:redirects unauthenticated customer endpoints to /signin', async ({ client }) => {
    const responses = await Promise.all([
      client.get('/customers').redirects(0),
      client.post('/customers').redirects(0).form({
        address: 'No Session Street',
        company: 'No Session Co',
        email: 'nosession@example.com',
        name: 'No Session',
        phone: '+1 555 1999',
      }),
      client.put('/customers/unknown-customer').redirects(0).form({
        address: 'No Session Street',
        company: 'No Session Co',
        email: 'nosession@example.com',
        name: 'No Session',
        phone: '+1 555 1999',
      }),
      client.delete('/customers/unknown-customer').redirects(0),
    ])

    for (const response of responses) {
      response.assertStatus(302)
      response.assertHeader('location', '/signin')
    }
  })

  test('contract:GET /customers returns 403 for inactive membership', async ({ client }) => {
    await db.update(member).set({ isActive: false }).where(eq(member.userId, fakeUser.id))

    const response = await inertiaHeaders(withAuthCookie(client.get('/customers'))).redirects(0)

    response.assertStatus(403)
  })

  test('contract:GET /customers returns minimal Inertia page contract', async ({
    assert,
    client,
  }) => {
    const customerId = uuidv7()
    await db.insert(customers).values({
      address: '7 rue de la Liste, Paris',
      company: 'Filterable Co',
      email: 'filterable@example.com',
      id: customerId,
      name: 'Filter User',
      organizationId: TEST_TENANT_ID,
      phone: '+33 6 11 22 33 44',
    })

    const response = await inertiaGet(client, '/customers?search=Filterable&perPage=25')

    response.assertStatus(200)
    assert.equal(response.body().component, 'app/customers')
    const props = response.body().props
    assert.equal(props.filters.search, 'Filterable')
    assert.equal(props.customers.items.length, 1)
    assert.equal(props.customers.items[0].id, customerId)
    assert.isTrue(props.canManageCustomers)
  })

  test('contract:POST /customers happy path returns redirect', async ({ assert, client }) => {
    const response = await withAuthCookie(client.post('/customers')).redirects(0).form({
      address: '1 rue des Tests, Paris',
      company: 'Feat Test Co',
      email: 'feat-test@example.com',
      name: 'Test User',
      phone: '+1 555 0100',
    })

    response.assertStatus(302)
    response.assertHeader('location', '/customers')

    const rows = await db.select().from(customers)
    assert.equal(rows.length, 1)
    assert.equal(rows[0].company, 'Feat Test Co')
  })

  test('contract:PUT /customers/:id happy path returns redirect', async ({ assert, client }) => {
    const id = uuidv7()
    await db.insert(customers).values({
      company: 'Kestrel Analytics',
      email: 'nina@kestrel.test',
      id,
      name: 'Nina Rossi',
      organizationId: TEST_TENANT_ID,
      phone: '+33 6 20 30 40 50',
    })

    const response = await withAuthCookie(client.put(`/customers/${id}`))
      .redirects(0)
      .form({
        address: '7 impasse du Port, Nantes',
        company: 'Kestrel Analytics Updated',
        email: 'nina@kestrel.test',
        name: 'Nina Rossi',
        note: 'Client onboarding',
        phone: '+33 6 20 30 40 50',
      })

    response.assertStatus(302)
    response.assertHeader('location', '/customers')

    const [updated] = await db.select().from(customers).where(eq(customers.id, id))
    assert.equal(updated.company, 'Kestrel Analytics Updated')
  })

  test('contract:PUT /customers/:id returns 404 when customer does not exist', async ({
    assert,
    client,
  }) => {
    const response = await withAuthCookie(client.put('/customers/unknown-client-id'))
      .header('accept', 'application/json')
      .json({
        address: 'Nowhere',
        company: 'Ghost Co',
        email: 'ghost@example.com',
        name: 'Ghost',
        phone: '+1 000',
      })

    response.assertStatus(404)

    const rows = await db.select().from(customers)
    assert.equal(rows.length, 0)
  })

  test('contract:POST /customers surface validation rejects invalid payload', async ({
    assert,
    client,
  }) => {
    const response = await withAuthCookie(client.post('/customers')).redirects(0).form({
      address: 'Short Street',
      company: 'X',
      email: 'not-an-email',
      name: 'Y',
      phone: '1',
    })

    response.assertStatus(302)

    const rows = await db.select().from(customers)
    assert.equal(rows.length, 0)
  })

  test('contract:DELETE /customers/:id happy path returns redirect', async ({ assert, client }) => {
    const customerId = uuidv7()
    await db.insert(customers).values({
      address: '12 avenue Redirect, Nantes',
      company: 'Redirect Co',
      email: 'redirect@example.com',
      id: customerId,
      name: 'Redirect User',
      organizationId: TEST_TENANT_ID,
      phone: '+33 6 77 88 99 00',
    })

    const response = await withAuthCookie(client.delete(`/customers/${customerId}`)).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/customers')
    const rows = await db.select().from(customers).where(eq(customers.id, customerId))
    assert.equal(rows.length, 0)
  })

  test('contract:DELETE /customers/:id returns 404 when customer does not exist', async ({
    assert,
    client,
  }) => {
    const response = await withAuthCookie(client.delete('/customers/non-existent-id'))
      .header('accept', 'application/json')
      .redirects(0)

    response.assertStatus(404)

    const rows = await db.select().from(customers)
    assert.equal(rows.length, 0)
  })

  test('contract:mutation redirects keep customer query-string per endpoint', async ({
    assert,
    client,
  }) => {
    const id = uuidv7()
    await db.insert(customers).values({
      address: '7 impasse Query, Nantes',
      company: 'Kestrel Analytics',
      email: 'nina@kestrel.test',
      id,
      name: 'Nina Rossi',
      organizationId: TEST_TENANT_ID,
      phone: '+33 6 20 30 40 50',
    })

    const createResponse = await withAuthCookie(client.post('/customers')).redirects(0).form({
      address: '1 rue Query, Paris',
      company: 'Query Co',
      email: 'query@example.com',
      name: 'Query User',
      page: 2,
      perPage: 25,
      phone: '+33 6 55 44 33 22',
      search: 'cursor',
    })
    createResponse.assertStatus(302)
    assertRedirectQuery(assert, createResponse.header('location'), {
      page: '2',
      perPage: '25',
      search: 'cursor',
    })

    const updateResponse = await withAuthCookie(client.put(`/customers/${id}`))
      .redirects(0)
      .form({
        address: '8 impasse Query, Nantes',
        company: 'Kestrel Analytics Updated',
        email: 'nina@kestrel.test',
        name: 'Nina Rossi',
        page: 4,
        perPage: 25,
        phone: '+33 6 20 30 40 50',
        search: 'query filter',
      })
    updateResponse.assertStatus(302)
    assertRedirectQuery(assert, updateResponse.header('location'), {
      page: '4',
      perPage: '25',
      search: 'query filter',
    })

    const deleteResponse = await withAuthCookie(client.delete(`/customers/${id}`))
      .redirects(0)
      .form({
        page: 3,
        perPage: 50,
        search: 'active filter',
      })
    deleteResponse.assertStatus(302)
    assertRedirectQuery(assert, deleteResponse.header('location'), {
      page: '3',
      perPage: '50',
      search: 'active filter',
    })
  })
})
