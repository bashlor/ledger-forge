import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { customers, invoices, journalEntries } from '#core/accounting/drizzle/schema'
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
})
