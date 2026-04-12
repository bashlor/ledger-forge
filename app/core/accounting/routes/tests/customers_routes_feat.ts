import { accountingStore } from '#core/accounting/services/mock_accounting_store'
import { AUTH_SESSION_TOKEN_COOKIE_NAME } from '#core/user_management/auth_session_cookie'
import {
  AuthenticationPort,
  type AuthProviderUser,
  type AuthResult,
} from '#core/user_management/domain/authentication'
import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'

const fakeUser: AuthProviderUser = {
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  email: 'test@example.com',
  emailVerified: true,
  id: 'user_test',
  image: null,
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

function authCookie() {
  return `${AUTH_SESSION_TOKEN_COOKIE_NAME}=${fakeSession.session.token}`
}

test.group('Customers routes | create, update, delete rules', (group) => {
  group.each.setup(() => {
    const auth = new FakeAuth()
    app.container.bindValue(AuthenticationPort, auth)
    app.container.bindValue('authAdapter', auth)
  })

  test('creates a customer via POST /customers', async ({ assert, client }) => {
    const before = accountingStore.listCustomers().length

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

    const after = accountingStore.listCustomers()
    assert.equal(after.length, before + 1)
    const created = after.find((c) => c.company === 'Feat Test Co')
    assert.isDefined(created)
    assert.equal(created?.email, 'feat-test@example.com')
  })

  test('updates a customer via PUT /customers/:id', async ({ assert, client }) => {
    const target = accountingStore.listCustomers().find((c) => c.id === 'client-3')
    assert.isDefined(target)

    const response = await client
      .put('/customers/client-3')
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

    const updated = accountingStore.listCustomers().find((c) => c.id === 'client-3')
    assert.equal(updated?.company, 'Kestrel Analytics Updated')
  })

  test('rejects PUT /customers/:id when customer does not exist', async ({ assert, client }) => {
    const before = accountingStore.listCustomers().length

    const response = await client
      .put('/customers/unknown-client-id')
      .header('cookie', authCookie())
      .redirects(0)
      .form({
        company: 'Ghost Co',
        email: 'ghost@example.com',
        name: 'Ghost',
        phone: '+1 000',
      })

    assert.notEqual(response.status(), 200)
    assert.equal(accountingStore.listCustomers().length, before)
  })

  test('rejects POST /customers when validation fails', async ({ assert, client }) => {
    const before = accountingStore.listCustomers().length

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
    assert.equal(accountingStore.listCustomers().length, before)
  })

  test('does not delete a customer referenced by invoices', async ({ assert, client }) => {
    const before = accountingStore.listCustomers().find((c) => c.id === 'client-1')
    assert.isDefined(before)

    const response = await client
      .delete('/customers/client-1')
      .header('cookie', authCookie())
      .redirects(0)

    response.assertStatus(302)
    assert.isDefined(accountingStore.listCustomers().find((c) => c.id === 'client-1'))
  })
})
