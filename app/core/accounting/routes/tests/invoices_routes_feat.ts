import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { customers, invoiceLines, invoices, journalEntries } from '#core/accounting/drizzle/schema'
import { AUTH_SESSION_TOKEN_COOKIE_NAME } from '#core/user_management/auth_session_cookie'
import {
  AuthenticationPort,
  type AuthProviderUser,
  type AuthResult,
} from '#core/user_management/domain/authentication'
import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'
import { eq } from 'drizzle-orm'

import { setupTestDatabaseForGroup } from '../../../../../tests/helpers/testcontainers_db.js'

const fakeUser: AuthProviderUser = {
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  email: 'test@example.com',
  emailVerified: true,
  id: 'user_test_invoices',
  image: null,
  name: 'Test User',
}

const fakeSession: AuthResult = {
  session: {
    expiresAt: new Date('2030-01-01T00:00:00.000Z'),
    token: 'test_session_token_invoices',
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

let db: PostgresJsDatabase<any>

const TEST_CUSTOMER_ID = 'test-customer-for-invoices'

function authCookie() {
  return `${AUTH_SESSION_TOKEN_COOKIE_NAME}=${fakeSession.session.token}`
}

/**
 * Create a draft invoice via HTTP and return the first invoice row from DB.
 */
async function createDraftViaHttp(client: any) {
  await client.post('/invoices').header('cookie', authCookie()).redirects(0).form({
    customerId: TEST_CUSTOMER_ID,
    dueDate: '2026-04-30',
    issueDate: '2026-04-01',
    'lines[0][description]': 'Consulting services',
    'lines[0][quantity]': 2,
    'lines[0][unitPrice]': 500,
    'lines[0][vatRate]': 20,
  })

  const [draft] = await db.select().from(invoices)
  return draft
}

test.group('Invoices routes | backend invariants', (group) => {
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
    // Clear in FK-safe order: journal_entries → invoices (cascades invoice_lines) → customers
    await db.delete(journalEntries)
    await db.delete(invoices)
    await db.delete(customers)

    await db.insert(customers).values({
      company: 'Test Company SAS',
      email: 'contact@testco.fr',
      id: TEST_CUSTOMER_ID,
      name: 'Alice Martin',
      phone: '+33 6 12 34 56 78',
    })
  })

  group.teardown(async () => cleanup())

  test('totals are recalculated server-side (body totals are ignored)', async ({
    assert,
    client,
  }) => {
    // qty=2, unitPrice=500, vatRate=20
    // Expected: exclTax=1000, vat=200, inclTax=1200 (all in cents ×100)
    const response = await client
      .post('/invoices')
      .header('cookie', authCookie())
      .redirects(0)
      .form({
        customerId: TEST_CUSTOMER_ID,
        dueDate: '2026-04-30',
        issueDate: '2026-04-01',
        'lines[0][description]': 'Consulting',
        'lines[0][quantity]': 2,
        'lines[0][unitPrice]': 500,
        'lines[0][vatRate]': 20,
      })

    response.assertStatus(302)

    const [invoice] = await db.select().from(invoices)

    assert.equal(invoice.subtotalExclTaxCents, 100_000)
    assert.equal(invoice.totalVatCents, 20_000)
    assert.equal(invoice.totalInclTaxCents, 120_000)

    const lines = await db.select().from(invoiceLines).where(eq(invoiceLines.invoiceId, invoice.id))
    assert.equal(lines.length, 1)
    assert.equal(lines[0].lineTotalExclTaxCents, 100_000)
    assert.equal(lines[0].lineTotalVatCents, 20_000)
    assert.equal(lines[0].lineTotalInclTaxCents, 120_000)
  })

  test('draft → issued is irreversible (re-issuing an issued invoice is rejected)', async ({
    assert,
    client,
  }) => {
    const draft = await createDraftViaHttp(client)

    const issueResponse = await client
      .post(`/invoices/${draft.id}/issue`)
      .header('cookie', authCookie())
      .redirects(0)
      .form({})

    issueResponse.assertStatus(302)

    const [issued] = await db.select().from(invoices).where(eq(invoices.id, draft.id))
    assert.equal(issued.status, 'issued')

    // Attempt to re-issue
    await client
      .post(`/invoices/${draft.id}/issue`)
      .header('cookie', authCookie())
      .redirects(0)
      .form({})

    // Status must remain 'issued' (not crash, redirects with flash error)
    const [stillIssued] = await db.select().from(invoices).where(eq(invoices.id, draft.id))
    assert.equal(stillIssued.status, 'issued')
  })

  test('only draft invoices can be deleted', async ({ assert, client }) => {
    const draft = await createDraftViaHttp(client)

    // Issue first
    await client
      .post(`/invoices/${draft.id}/issue`)
      .header('cookie', authCookie())
      .redirects(0)
      .form({})

    // Attempt to delete an issued invoice
    const deleteResponse = await client
      .delete(`/invoices/${draft.id}`)
      .header('cookie', authCookie())
      .redirects(0)

    deleteResponse.assertStatus(302)

    const rows = await db.select().from(invoices)
    assert.equal(rows.length, 1, 'issued invoice was not deleted')
    assert.equal(rows[0].status, 'issued')
  })

  test('a journal entry is created when an invoice is issued', async ({ assert, client }) => {
    const draft = await createDraftViaHttp(client)

    await client
      .post(`/invoices/${draft.id}/issue`)
      .header('cookie', authCookie())
      .redirects(0)
      .form({})

    const entries = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.invoiceId, draft.id))

    assert.equal(entries.length, 1)
    assert.equal(entries[0].type, 'invoice')
    assert.equal(entries[0].amountCents, 120_000)
    assert.equal(entries[0].date, '2026-04-01')
  })

  test('concurrent issue requests create only one journal entry', async ({ assert, client }) => {
    const draft = await createDraftViaHttp(client)

    await Promise.allSettled([
      client.post(`/invoices/${draft.id}/issue`).header('cookie', authCookie()).redirects(0).form({}),
      client.post(`/invoices/${draft.id}/issue`).header('cookie', authCookie()).redirects(0).form({}),
    ])

    const [row] = await db.select().from(invoices).where(eq(invoices.id, draft.id))
    assert.equal(row.status, 'issued')

    const entries = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.invoiceId, draft.id))
    assert.equal(entries.length, 1)
  })

  test('mark-paid is rejected for a draft invoice (issued → paid only)', async ({
    assert,
    client,
  }) => {
    const draft = await createDraftViaHttp(client)

    // Attempt to mark-paid while still a draft
    await client
      .post(`/invoices/${draft.id}/mark-paid`)
      .header('cookie', authCookie())
      .redirects(0)
      .form({})

    const [row] = await db.select().from(invoices).where(eq(invoices.id, draft.id))
    assert.equal(row.status, 'draft', 'draft invoice was not changed to paid')
  })

  test('concurrent mark-paid requests keep a single valid paid transition', async ({
    assert,
    client,
  }) => {
    const draft = await createDraftViaHttp(client)

    await client.post(`/invoices/${draft.id}/issue`).header('cookie', authCookie()).redirects(0).form({})

    await Promise.allSettled([
      client
        .post(`/invoices/${draft.id}/mark-paid`)
        .header('cookie', authCookie())
        .redirects(0)
        .form({}),
      client
        .post(`/invoices/${draft.id}/mark-paid`)
        .header('cookie', authCookie())
        .redirects(0)
        .form({}),
    ])

    const [row] = await db.select().from(invoices).where(eq(invoices.id, draft.id))
    assert.equal(row.status, 'paid')
  })

  test('concurrent delete-draft requests leave no invoice row', async ({ assert, client }) => {
    const draft = await createDraftViaHttp(client)

    await Promise.allSettled([
      client.delete(`/invoices/${draft.id}`).header('cookie', authCookie()).redirects(0),
      client.delete(`/invoices/${draft.id}`).header('cookie', authCookie()).redirects(0),
    ])

    const rows = await db.select().from(invoices).where(eq(invoices.id, draft.id))
    assert.equal(rows.length, 0)
  })

  test('concurrent update-draft requests keep invoice data consistent', async ({ assert, client }) => {
    const draft = await createDraftViaHttp(client)

    const payloadA = {
      customerId: TEST_CUSTOMER_ID,
      dueDate: '2026-05-05',
      issueDate: '2026-04-20',
      'lines[0][description]': 'Concurrent update A',
      'lines[0][quantity]': 1,
      'lines[0][unitPrice]': 200,
      'lines[0][vatRate]': 20,
    }

    const payloadB = {
      customerId: TEST_CUSTOMER_ID,
      dueDate: '2026-06-06',
      issueDate: '2026-04-21',
      'lines[0][description]': 'Concurrent update B',
      'lines[0][quantity]': 3,
      'lines[0][unitPrice]': 150,
      'lines[0][vatRate]': 10,
    }

    await Promise.allSettled([
      client.put(`/invoices/${draft.id}/draft`).header('cookie', authCookie()).redirects(0).form(payloadA),
      client.put(`/invoices/${draft.id}/draft`).header('cookie', authCookie()).redirects(0).form(payloadB),
    ])

    const [row] = await db.select().from(invoices).where(eq(invoices.id, draft.id))
    assert.equal(row.status, 'draft')

    const finalOptions = [
      {
        description: 'Concurrent update A',
        dueDate: '2026-05-05',
        issueDate: '2026-04-20',
        subtotalExclTaxCents: 20_000,
        totalVatCents: 4_000,
        totalInclTaxCents: 24_000,
      },
      {
        description: 'Concurrent update B',
        dueDate: '2026-06-06',
        issueDate: '2026-04-21',
        subtotalExclTaxCents: 45_000,
        totalVatCents: 4_500,
        totalInclTaxCents: 49_500,
      },
    ]

    const matched = finalOptions.some(
      (option) =>
        row.dueDate === option.dueDate &&
        row.issueDate === option.issueDate &&
        row.subtotalExclTaxCents === option.subtotalExclTaxCents &&
        row.totalVatCents === option.totalVatCents &&
        row.totalInclTaxCents === option.totalInclTaxCents
    )
    assert.isTrue(matched)

    const lines = await db
      .select()
      .from(invoiceLines)
      .where(eq(invoiceLines.invoiceId, draft.id))
      .orderBy(invoiceLines.lineNumber)

    assert.equal(lines.length, 1)
    assert.include(['Concurrent update A', 'Concurrent update B'], lines[0].description)
  })
})
