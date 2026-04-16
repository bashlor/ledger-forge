import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { customers, invoices, journalEntries } from '#core/accounting/drizzle/schema'
import { CustomerService } from '#core/accounting/services/customer_service'
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

import { setupTestDatabaseForGroup } from '../../../../../tests/helpers/testcontainers_db.js'

const fakeUser: AuthProviderUser = {
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  email: 'test@example.com',
  emailVerified: true,
  id: 'user_test_customers',
  image: null,
  isAnonymous: false,
  name: 'Test User',
}

const fakeSession: AuthResult = {
  session: {
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

function authCookie() {
  return `${AUTH_SESSION_TOKEN_COOKIE_NAME}=${fakeSession.session.token}`
}

test.group('Customers routes | create, update, delete rules', (group) => {
  let cleanup: () => Promise<void>

  group.setup(async () => {
    const ctx = await setupTestDatabaseForGroup()
    cleanup = ctx.cleanup
    db = await app.container.make('drizzle')

    const auth = new FakeAuth()
    app.container.bindValue(AuthenticationPort, auth)
    app.container.bindValue('authAdapter', auth)
  })

  group.each.setup(async () => {
    await db.delete(journalEntries)
    await db.delete(invoices)
    await db.delete(customers)
  })

  group.teardown(async () => cleanup())

  test('creates a customer via POST /customers', async ({ assert, client }) => {
    const response = await client
      .post('/customers')
      .header('cookie', authCookie())
      .redirects(0)
      .form({
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
    assert.equal(rows[0].email, 'feat-test@example.com')
  })

  test('redirects unauthenticated requests for customer routes to /signin', async ({ client }) => {
    const getResponse = await client.get('/customers').redirects(0)
    getResponse.assertStatus(302)
    getResponse.assertHeader('location', '/signin')

    const postResponse = await client.post('/customers').redirects(0).form({
      company: 'No Session Co',
      email: 'nosession@example.com',
      name: 'No Session',
      phone: '+1 555 1999',
    })
    postResponse.assertStatus(302)
    postResponse.assertHeader('location', '/signin')
  })

  test('updates a customer via PUT /customers/:id', async ({ assert, client }) => {
    const id = uuidv7()
    await db.insert(customers).values({
      company: 'Kestrel Analytics',
      email: 'nina@kestrel.test',
      id,
      name: 'Nina Rossi',
      phone: '+33 6 20 30 40 50',
    })

    const response = await client
      .put(`/customers/${id}`)
      .header('cookie', authCookie())
      .redirects(0)
      .form({
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

  test('rejects PUT /customers/:id when customer does not exist', async ({ assert, client }) => {
    const response = await client
      .put('/customers/unknown-client-id')
      .header('cookie', authCookie())
      .header('accept', 'application/json')
      .json({
        company: 'Ghost Co',
        email: 'ghost@example.com',
        name: 'Ghost',
        phone: '+1 000',
      })

    response.assertStatus(404)

    const rows = await db.select().from(customers)
    assert.equal(rows.length, 0)
  })

  test('rejects POST /customers when validation fails', async ({ assert, client }) => {
    const response = await client
      .post('/customers')
      .header('cookie', authCookie())
      .redirects(0)
      .form({
        company: 'X',
        email: 'not-an-email',
        name: 'Y',
        phone: '1',
      })

    response.assertStatus(302)

    const rows = await db.select().from(customers)
    assert.equal(rows.length, 0)
  })

  test('creates a customer when only email is provided', async ({ assert, client }) => {
    const response = await client
      .post('/customers')
      .header('cookie', authCookie())
      .redirects(0)
      .form({
        company: 'Email Only Co',
        email: 'email-only@example.com',
        name: 'Email Contact',
      })

    response.assertStatus(302)
    response.assertHeader('location', '/customers')

    const [row] = await db.select().from(customers)
    assert.equal(row.company, 'Email Only Co')
    assert.equal(row.email, 'email-only@example.com')
    assert.equal(row.phone, '')
  })

  test('creates a customer when only phone is provided', async ({ assert, client }) => {
    const response = await client
      .post('/customers')
      .header('cookie', authCookie())
      .redirects(0)
      .form({
        company: 'Phone Only Co',
        name: 'Phone Contact',
        phone: '+1 555 0000',
      })

    response.assertStatus(302)
    response.assertHeader('location', '/customers')

    const [row] = await db.select().from(customers)
    assert.equal(row.company, 'Phone Only Co')
    assert.equal(row.email, '')
    assert.equal(row.phone, '+1 555 0000')
  })

  test('rejects POST /customers when both email and phone are missing', async ({ assert, client }) => {
    const response = await client
      .post('/customers')
      .header('cookie', authCookie())
      .redirects(0)
      .form({
        company: 'Missing Contact Co',
        name: 'Missing Contact',
      })

    response.assertStatus(302)
    response.assertHeader('location', '/customers')

    const rows = await db.select().from(customers)
    assert.equal(rows.length, 0)
  })

  test('does not delete a customer referenced by invoices', async ({ assert, client }) => {
    const customerId = uuidv7()
    await db.insert(customers).values({
      company: 'Linked Co',
      email: 'linked@example.com',
      id: customerId,
      name: 'Linked User',
      phone: '+1 555 0200',
    })

    await db.insert(invoices).values({
      customerId,
      customerName: 'Linked Co',
      dueDate: '2026-04-30',
      id: uuidv7(),
      invoiceNumber: 'INV-2026-FEAT-001',
      issueDate: '2026-04-01',
      status: 'draft',
    })

    const response = await client
      .delete(`/customers/${customerId}`)
      .header('cookie', authCookie())
      .redirects(0)

    response.assertStatus(302)

    const custRows = await db.select().from(customers).where(eq(customers.id, customerId))
    assert.equal(custRows.length, 1)
  })

  test('returns invoice counters in customers listing data', async ({ assert }) => {
    const linkedCustomerId = uuidv7()
    const freeCustomerId = uuidv7()

    await db.insert(customers).values([
      {
        company: 'Linked Company',
        email: 'linked-company@example.com',
        id: linkedCustomerId,
        name: 'Linked Person',
        phone: '+1 555 0300',
      },
      {
        company: 'Free Company',
        email: 'free-company@example.com',
        id: freeCustomerId,
        name: 'Free Person',
        phone: '+1 555 0400',
      },
    ])

    await db.insert(invoices).values({
      customerId: linkedCustomerId,
      customerName: 'Linked Company',
      dueDate: '2026-05-15',
      id: uuidv7(),
      invoiceNumber: 'INV-2026-FEAT-002',
      issueDate: '2026-05-01',
      status: 'draft',
    })

    const customerService = new CustomerService(db)
    const { items } = await customerService.listCustomersPage(1, 10)
    const linked = items.find((entry) => entry.id === linkedCustomerId)
    const free = items.find((entry) => entry.id === freeCustomerId)

    assert.equal(linked?.invoiceCount, 1)
    assert.equal(linked?.canDelete, false)
    assert.equal(free?.invoiceCount, 0)
    assert.equal(free?.canDelete, true)
  })
})
