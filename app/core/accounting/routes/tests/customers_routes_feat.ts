import type { AccountingAccessContext } from '#core/accounting/application/support/access_context'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { CustomerService } from '#core/accounting/application/customers/index'
import { auditEvents, customers, invoices, journalEntries } from '#core/accounting/drizzle/schema'
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

import { expectRejects } from '../../../../../tests/helpers/expect_rejects.js'
import {
  seedTestOrganization,
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

const TEST_ACCOUNTING_ACCESS_CONTEXT: AccountingAccessContext = {
  actorId: fakeUser.id,
  isAnonymous: false,
  requestId: 'test',
  tenantId: TEST_TENANT_ID,
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

function inertiaHeaders(request: any) {
  request.header('x-inertia', 'true')
  request.header('x-inertia-version', '1')
  return request
}

function withAuthCookie(request: any) {
  request.cookie(AUTH_SESSION_TOKEN_COOKIE_NAME, fakeSession.session.token)
  return request
}

test.group('Customers routes | create, update, delete rules', (group) => {
  let cleanup: () => Promise<void>

  group.setup(async () => {
    const ctx = await setupTestDatabaseForGroup()
    cleanup = ctx.cleanup
    db = await app.container.make('drizzle')
    await seedTestOrganization(db)

    const auth = new FakeAuth()
    app.container.bindValue(AuthenticationPort, auth)
    app.container.bindValue('authAdapter', auth)
  })

  group.each.setup(async () => {
    await db.delete(auditEvents)
    await db.delete(journalEntries)
    await db.delete(invoices)
    await db.delete(customers)
  })

  group.teardown(async () => cleanup())

  test('creates a customer via POST /customers', async ({ assert, client }) => {
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
    assert.equal(rows[0].address, '1 rue des Tests, Paris')
    assert.equal(rows[0].company, 'Feat Test Co')
    assert.equal(rows[0].email, 'feat-test@example.com')
  })

  test('redirects unauthenticated requests for customer routes to /signin', async ({ client }) => {
    const getResponse = await client.get('/customers').redirects(0)
    getResponse.assertStatus(302)
    getResponse.assertHeader('location', '/signin')

    const postResponse = await client.post('/customers').redirects(0).form({
      address: 'No Session Street',
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
    assert.equal(updated.address, '7 impasse du Port, Nantes')
    assert.equal(updated.company, 'Kestrel Analytics Updated')
  })

  test('rejects PUT /customers/:id when customer does not exist', async ({ assert, client }) => {
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

  test('rejects POST /customers when validation fails', async ({ assert, client }) => {
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

  test('creates a customer when only email is provided', async ({ assert, client }) => {
    const response = await withAuthCookie(client.post('/customers')).redirects(0).form({
      address: '22 boulevard Email, Lille',
      company: 'Email Only Co',
      email: 'email-only@example.com',
      name: 'Email Contact',
    })

    response.assertStatus(302)
    response.assertHeader('location', '/customers')

    const [row] = await db.select().from(customers)
    assert.equal(row.address, '22 boulevard Email, Lille')
    assert.equal(row.company, 'Email Only Co')
    assert.equal(row.email, 'email-only@example.com')
    assert.equal(row.phone, '')
  })

  test('creates a customer when only phone is provided', async ({ assert, client }) => {
    const response = await withAuthCookie(client.post('/customers')).redirects(0).form({
      address: '44 avenue Phone, Rennes',
      company: 'Phone Only Co',
      name: 'Phone Contact',
      phone: '+1 555 0000',
    })

    response.assertStatus(302)
    response.assertHeader('location', '/customers')

    const [row] = await db.select().from(customers)
    assert.equal(row.address, '44 avenue Phone, Rennes')
    assert.equal(row.company, 'Phone Only Co')
    assert.equal(row.email, '')
    assert.equal(row.phone, '+1 555 0000')
  })

  test('rejects POST /customers when both email and phone are missing', async ({
    assert,
    client,
  }) => {
    const response = await inertiaHeaders(withAuthCookie(client.post('/customers')))
      .redirects(0)
      .form({
        address: 'Missing Contact Street',
        company: 'Missing Contact Co',
        name: 'Missing Contact',
      })

    response.assertStatus(302)
    response.assertHeader('location', '/customers')

    const rows = await db.select().from(customers)
    assert.equal(rows.length, 0)
  })

  test('customer service rejects blank company and contact details after trim', async ({
    assert,
  }) => {
    const customerService = new CustomerService(db)

    await expectRejects(assert, () =>
      customerService.createCustomer(
        {
          address: '5 rue des Tests, Paris',
          company: '   ',
          email: '   ',
          name: '   ',
          phone: '   ',
        },
        TEST_ACCOUNTING_ACCESS_CONTEXT
      )
    )

    const rows = await db.select().from(customers)
    assert.equal(rows.length, 0)
  })

  test('customer service rejects update when both email and phone are blank after trim', async ({
    assert,
  }) => {
    const id = uuidv7()
    await db.insert(customers).values({
      address: '7 impasse du Port, Nantes',
      company: 'Kestrel Analytics',
      email: 'nina@kestrel.test',
      id,
      name: 'Nina Rossi',
      organizationId: TEST_TENANT_ID,
      phone: '+33 6 20 30 40 50',
    })

    const customerService = new CustomerService(db)

    await expectRejects(assert, () =>
      customerService.updateCustomer(
        id,
        {
          address: '8 impasse du Port, Nantes',
          company: 'Kestrel Analytics',
          email: '   ',
          name: 'Nina Rossi',
          phone: '   ',
        },
        TEST_ACCOUNTING_ACCESS_CONTEXT
      )
    )

    const [unchanged] = await db.select().from(customers).where(eq(customers.id, id))
    assert.equal(unchanged.email, 'nina@kestrel.test')
    assert.equal(unchanged.phone, '+33 6 20 30 40 50')
  })

  test('does not delete a customer referenced by invoices', async ({ assert, client }) => {
    const customerId = uuidv7()
    await db.insert(customers).values({
      address: 'Linked Address',
      company: 'Linked Co',
      email: 'linked@example.com',
      id: customerId,
      name: 'Linked User',
      organizationId: TEST_TENANT_ID,
      phone: '+1 555 0200',
    })

    await db.insert(invoices).values({
      customerCompanyAddressSnapshot: 'Linked Address',
      customerCompanyName: 'Linked Co',
      customerCompanySnapshot: 'Linked Co',
      customerEmailSnapshot: 'linked@example.com',
      customerId,
      customerPhoneSnapshot: '+1 555 0200',
      customerPrimaryContactSnapshot: 'Linked User',
      dueDate: '2026-04-30',
      id: uuidv7(),
      invoiceNumber: 'INV-2026-FEAT-001',
      issueDate: '2026-04-01',
      issuedCompanyAddress: '',
      issuedCompanyName: '',
      organizationId: TEST_TENANT_ID,
      status: 'draft',
    })

    const response = await withAuthCookie(client.delete(`/customers/${customerId}`)).redirects(0)

    response.assertStatus(302)

    const custRows = await db.select().from(customers).where(eq(customers.id, customerId))
    assert.equal(custRows.length, 1)
  })

  test('returns invoice counters in customers listing data', async ({ assert }) => {
    const linkedCustomerId = uuidv7()
    const freeCustomerId = uuidv7()

    await db.insert(customers).values([
      {
        address: 'Linked Address 2',
        company: 'Linked Company',
        email: 'linked-company@example.com',
        id: linkedCustomerId,
        name: 'Linked Person',
        organizationId: TEST_TENANT_ID,
        phone: '+1 555 0300',
      },
      {
        address: 'Free Address',
        company: 'Free Company',
        email: 'free-company@example.com',
        id: freeCustomerId,
        name: 'Free Person',
        organizationId: TEST_TENANT_ID,
        phone: '+1 555 0400',
      },
    ])

    await db.insert(invoices).values({
      customerCompanyAddressSnapshot: 'Linked Address 2',
      customerCompanyName: 'Linked Company',
      customerCompanySnapshot: 'Linked Company',
      customerEmailSnapshot: 'linked-company@example.com',
      customerId: linkedCustomerId,
      customerPhoneSnapshot: '+1 555 0300',
      customerPrimaryContactSnapshot: 'Linked Person',
      dueDate: '2026-05-15',
      id: uuidv7(),
      invoiceNumber: 'INV-2026-FEAT-002',
      issueDate: '2026-05-01',
      issuedCompanyAddress: '',
      issuedCompanyName: '',
      organizationId: TEST_TENANT_ID,
      status: 'draft',
    })

    const customerService = new CustomerService(db)
    const { items } = await customerService.listCustomersPage(1, 10, TEST_ACCOUNTING_ACCESS_CONTEXT)
    const linked = items.find((entry) => entry.id === linkedCustomerId)
    const free = items.find((entry) => entry.id === freeCustomerId)

    assert.equal(linked?.invoiceCount, 1)
    assert.equal(linked?.canDelete, false)
    assert.equal(free?.invoiceCount, 0)
    assert.equal(free?.canDelete, true)
  })

  test('customer listing clamps invalid pagination inputs', async ({ assert }) => {
    await db.insert(customers).values([
      {
        address: '1 test street',
        company: 'Alpha Co',
        email: 'alpha@example.com',
        id: uuidv7(),
        name: 'Alpha User',
        organizationId: TEST_TENANT_ID,
        phone: '+1 555 1000',
      },
      {
        address: '2 test street',
        company: 'Beta Co',
        email: 'beta@example.com',
        id: uuidv7(),
        name: 'Beta User',
        organizationId: TEST_TENANT_ID,
        phone: '+1 555 1001',
      },
      {
        address: '3 test street',
        company: 'Gamma Co',
        email: 'gamma@example.com',
        id: uuidv7(),
        name: 'Gamma User',
        organizationId: TEST_TENANT_ID,
        phone: '+1 555 1002',
      },
    ])

    const customerService = new CustomerService(db)

    const negativePage = await customerService.listCustomersPage(
      -4,
      2,
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )
    assert.equal(negativePage.pagination.page, 1)
    assert.equal(negativePage.pagination.perPage, 2)
    assert.equal(negativePage.items.length, 2)

    const oversizedPage = await customerService.listCustomersPage(
      999,
      2,
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )
    assert.equal(oversizedPage.pagination.page, 2)
    assert.equal(oversizedPage.pagination.totalPages, 2)
    assert.equal(oversizedPage.items.length, 1)

    const invalidPerPage = await customerService.listCustomersPage(
      1,
      0,
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )
    assert.equal(invalidPerPage.pagination.perPage, 1)
    assert.equal(invalidPerPage.items.length, 1)
  })

  test('deleting a non-existent customer returns 404', async ({ assert, client }) => {
    const response = await withAuthCookie(client.delete('/customers/non-existent-id'))
      .header('accept', 'application/json')
      .redirects(0)

    response.assertStatus(404)

    const rows = await db.select().from(customers)
    assert.equal(rows.length, 0)
  })

  test('concurrent delete of same customer completes without error', async ({ assert, client }) => {
    const id = uuidv7()
    await db.insert(customers).values({
      address: 'Concurrent Delete Street',
      company: 'Concurrent Delete Co',
      email: 'concurrent-delete@example.com',
      id,
      name: 'Concurrent Delete User',
      organizationId: TEST_TENANT_ID,
      phone: '+1 555 0500',
    })

    await Promise.allSettled([
      withAuthCookie(client.delete(`/customers/${id}`)).redirects(0),
      withAuthCookie(client.delete(`/customers/${id}`)).redirects(0),
    ])

    const rows = await db.select().from(customers).where(eq(customers.id, id))
    assert.equal(rows.length, 0, 'customer must be deleted exactly once')
  })
})
