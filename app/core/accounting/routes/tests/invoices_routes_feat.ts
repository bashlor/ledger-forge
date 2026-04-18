import type { AccountingBusinessCalendar } from '#core/accounting/accounting_context'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { customers, invoiceLines, invoices, journalEntries } from '#core/accounting/drizzle/schema'
import { CustomerService } from '#core/accounting/services/customer_service'
import { InvoiceService } from '#core/accounting/services/invoice_service'
import { AUTH_SESSION_TOKEN_COOKIE_NAME } from '#core/user_management/auth_session_cookie'
import {
  AuthenticationPort,
  type AuthProviderUser,
  type AuthResult,
} from '#core/user_management/domain/authentication'
import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'
import { eq } from 'drizzle-orm'

import { runSimultaneously } from '../../../../../tests/helpers/concurrency_barrier.js'
import { expectRejects } from '../../../../../tests/helpers/expect_rejects.js'
import { setupTestDatabaseForGroup } from '../../../../../tests/helpers/testcontainers_db.js'

const fakeUser: AuthProviderUser = {
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  email: 'test@example.com',
  emailVerified: true,
  id: 'accounting_test_invoices_user',
  image: null,
  isAnonymous: false,
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

const TEST_CUSTOMER_ID = 'test-customer-for-invoices'

class FixedBusinessCalendar implements AccountingBusinessCalendar {
  constructor(private readonly businessDate: string) {}

  dateFromTimestamp(_value: Date): string {
    return this.businessDate
  }

  today(): string {
    return this.businessDate
  }
}

function authCookie() {
  return `${AUTH_SESSION_TOKEN_COOKIE_NAME}=${fakeSession.session.token}`
}

/**
 * Create a draft invoice via HTTP and return the first invoice row from DB.
 */
async function createDraftViaHttp(client: any) {
  const today = new Date()
  const issueDate = today.toISOString().slice(0, 10)
  const due = new Date(today)
  due.setDate(today.getDate() + 30)
  const dueDate = due.toISOString().slice(0, 10)

  await client.post('/invoices').header('cookie', authCookie()).redirects(0).form({
    customerId: TEST_CUSTOMER_ID,
    dueDate,
    issueDate,
    'lines[0][description]': 'Consulting services',
    'lines[0][quantity]': 2,
    'lines[0][unitPrice]': 500,
    'lines[0][vatRate]': 20,
  })

  const [draft] = await db.select().from(invoices)
  return draft
}

function issuePayload() {
  return {
    issuedCompanyAddress: "10 rue de l'Emission\n75002 Paris",
    issuedCompanyName: 'Issued Company Name',
  }
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
      address: '10 rue de la Paix, 75002 Paris',
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

  test('concurrent draft creation generates unique invoice numbers', async ({ assert, client }) => {
    const draftPayload = {
      customerId: TEST_CUSTOMER_ID,
      dueDate: '2026-04-30',
      issueDate: '2026-04-01',
      'lines[0][description]': 'Concurrent numbering',
      'lines[0][quantity]': 1,
      'lines[0][unitPrice]': 100,
      'lines[0][vatRate]': 20,
    }

    await Promise.allSettled([
      client.post('/invoices').header('cookie', authCookie()).redirects(0).form(draftPayload),
      client.post('/invoices').header('cookie', authCookie()).redirects(0).form(draftPayload),
    ])

    const rows = await db.select().from(invoices)
    assert.equal(rows.length, 2)

    const invoiceNumbers = rows.map((row) => row.invoiceNumber)
    assert.equal(new Set(invoiceNumbers).size, 2)
    assert.include(invoiceNumbers, 'INV-2026-001')
    assert.include(invoiceNumbers, 'INV-2026-002')
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
      .form(issuePayload())

    issueResponse.assertStatus(302)

    const [issued] = await db.select().from(invoices).where(eq(invoices.id, draft.id))
    assert.equal(issued.status, 'issued')

    // Attempt to re-issue
    await client
      .post(`/invoices/${draft.id}/issue`)
      .header('cookie', authCookie())
      .redirects(0)
      .form(issuePayload())

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
      .form(issuePayload())

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
      .form(issuePayload())

    const entries = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.invoiceId, draft.id))

    assert.equal(entries.length, 1)
    assert.equal(entries[0].type, 'invoice')
    assert.equal(entries[0].amountCents, 120_000)
    assert.equal(entries[0].date, draft.issueDate)
  })

  test('concurrent issue requests create only one journal entry', async ({ assert, client }) => {
    // Simultaneity test model:
    // - read phase is diagnostic
    // - conditional write arbitrates the winner
    // - transaction keeps winner workflow atomic
    const draft = await createDraftViaHttp(client)
    const service = new InvoiceService(db)
    const results = await runSimultaneously([
      (waitAtBarrier) =>
        service.issueInvoice(draft.id, issuePayload(), { afterRead: waitAtBarrier }),
      (waitAtBarrier) =>
        service.issueInvoice(draft.id, issuePayload(), { afterRead: waitAtBarrier }),
    ])
    assert.equal(
      results.filter((result) => result.status === 'fulfilled').length,
      1,
      'only one issue should win in simultaneous execution'
    )

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
      .form(issuePayload())

    const [row] = await db.select().from(invoices).where(eq(invoices.id, draft.id))
    assert.equal(row.status, 'draft', 'draft invoice was not changed to paid')
  })

  test('rejects draft creation when dueDate is before issueDate', async ({ assert, client }) => {
    const base = new Date()
    const dueDate = new Date(base)
    dueDate.setDate(base.getDate() + 5)
    const issueDate = new Date(base)
    issueDate.setDate(base.getDate() + 15)

    const response = await client
      .post('/invoices')
      .header('cookie', authCookie())
      .redirects(0)
      .form({
        customerId: TEST_CUSTOMER_ID,
        dueDate: dueDate.toISOString().slice(0, 10),
        issueDate: issueDate.toISOString().slice(0, 10),
        'lines[0][description]': 'Invalid dates',
        'lines[0][quantity]': 1,
        'lines[0][unitPrice]': 100,
        'lines[0][vatRate]': 20,
      })

    response.assertStatus(302)

    const rows = await db.select().from(invoices)
    assert.equal(rows.length, 0)
  })

  test('rejects invoice list queries with only one date bound', async ({ client }) => {
    const onlyStart = await client
      .get('/invoices?startDate=2026-04-01')
      .header('cookie', authCookie())
      .header('accept', 'application/json')

    onlyStart.assertStatus(422)

    const onlyEnd = await client
      .get('/invoices?endDate=2026-04-30')
      .header('cookie', authCookie())
      .header('accept', 'application/json')

    onlyEnd.assertStatus(422)
  })

  test('rejects draft creation when dueDate is before today', async ({ assert, client }) => {
    const today = new Date().toISOString().slice(0, 10)
    const issueDate = '2020-01-01'

    const response = await client
      .post('/invoices')
      .header('cookie', authCookie())
      .redirects(0)
      .form({
        customerId: TEST_CUSTOMER_ID,
        dueDate: issueDate,
        issueDate,
        'lines[0][description]': 'Past due date',
        'lines[0][quantity]': 1,
        'lines[0][unitPrice]': 100,
        'lines[0][vatRate]': 20,
      })

    response.assertStatus(302)
    const rows = await db.select().from(invoices)
    assert.equal(rows.length, 0)

    // Control: dueDate equal to draft creation date should be accepted.
    await client.post('/invoices').header('cookie', authCookie()).redirects(0).form({
      customerId: TEST_CUSTOMER_ID,
      dueDate: today,
      issueDate: '2020-01-01',
      'lines[0][description]': 'Due date equal to draft creation date',
      'lines[0][quantity]': 1,
      'lines[0][unitPrice]': 100,
      'lines[0][vatRate]': 20,
    })
    const acceptedRows = await db.select().from(invoices)
    assert.equal(acceptedRows.length, 1)
  })

  test('rejects updateDraft when dueDate is before draft creation date', async ({
    assert,
    client,
  }) => {
    const draft = await createDraftViaHttp(client)
    const service = new InvoiceService(db)

    const createdAtDate = draft.createdAt.toISOString().slice(0, 10)
    const previousDay = new Date(draft.createdAt)
    previousDay.setDate(previousDay.getDate() - 1)
    const dueDateBeforeCreation = previousDay.toISOString().slice(0, 10)

    let didThrow = false
    try {
      await service.updateDraft(draft.id, {
        customerId: TEST_CUSTOMER_ID,
        dueDate: dueDateBeforeCreation,
        issueDate: '2020-01-01',
        lines: [{ description: 'Updated line', quantity: 1, unitPrice: 100, vatRate: 20 }],
      })
    } catch {
      didThrow = true
    }
    assert.isTrue(didThrow)

    const [unchanged] = await db.select().from(invoices).where(eq(invoices.id, draft.id))
    assert.equal(unchanged.dueDate, draft.dueDate)
    assert.equal(createdAtDate <= (unchanged.dueDate ?? ''), true)
  })

  test('invoice service rejects invalid draft lines outside HTTP', async ({ assert }) => {
    const service = new InvoiceService(db)

    await expectRejects(assert, () =>
      service.createDraft({
        customerId: TEST_CUSTOMER_ID,
        dueDate: '2026-04-30',
        issueDate: '2026-04-01',
        lines: [],
      })
    )

    await expectRejects(assert, () =>
      service.createDraft({
        customerId: TEST_CUSTOMER_ID,
        dueDate: '2026-04-30',
        issueDate: '2026-04-01',
        lines: [{ description: '   ', quantity: 1, unitPrice: 100, vatRate: 20 }],
      })
    )

    await expectRejects(assert, () =>
      service.createDraft({
        customerId: TEST_CUSTOMER_ID,
        dueDate: '2026-04-30',
        issueDate: '2026-04-01',
        lines: [{ description: 'Consulting', quantity: 0, unitPrice: 100, vatRate: 20 }],
      })
    )

    await expectRejects(assert, () =>
      service.createDraft({
        customerId: TEST_CUSTOMER_ID,
        dueDate: '2026-04-30',
        issueDate: '2026-04-01',
        lines: [{ description: 'Consulting', quantity: 1, unitPrice: -1, vatRate: 20 }],
      })
    )

    await expectRejects(assert, () =>
      service.createDraft({
        customerId: TEST_CUSTOMER_ID,
        dueDate: '2026-04-30',
        issueDate: '2026-04-01',
        lines: [{ description: 'Consulting', quantity: 1, unitPrice: 100, vatRate: 120 }],
      })
    )

    const rows = await db.select().from(invoices)
    assert.equal(rows.length, 0)
  })

  test('invoice service rejects missing or malformed draft dates outside HTTP', async ({
    assert,
  }) => {
    const service = new InvoiceService(db)

    await expectRejects(assert, () =>
      service.createDraft({
        customerId: TEST_CUSTOMER_ID,
        dueDate: '2026-04-30',
        issueDate: '',
        lines: [{ description: 'Consulting', quantity: 1, unitPrice: 100, vatRate: 20 }],
      })
    )

    await expectRejects(assert, () =>
      service.createDraft({
        customerId: TEST_CUSTOMER_ID,
        dueDate: '30-04-2026',
        issueDate: '2026-04-01',
        lines: [{ description: 'Consulting', quantity: 1, unitPrice: 100, vatRate: 20 }],
      })
    )
  })

  test('invoice service rejects blank issued company fields outside HTTP', async ({
    assert,
    client,
  }) => {
    const draft = await createDraftViaHttp(client)
    const service = new InvoiceService(db)

    await expectRejects(assert, () =>
      service.issueInvoice(draft.id, {
        issuedCompanyAddress: '   ',
        issuedCompanyName: '   ',
      })
    )

    const [row] = await db.select().from(invoices).where(eq(invoices.id, draft.id))
    assert.equal(row.status, 'draft')
    assert.equal(row.issuedCompanyName, '')
    assert.equal(row.issuedCompanyAddress, '')
  })

  test('getInvoiceForListScope does not bypass active customer or date filters', async ({
    assert,
  }) => {
    const service = new InvoiceService(db, {
      businessCalendar: new FixedBusinessCalendar('2026-04-01'),
    })

    const otherCustomerId = 'test-customer-outside-scope'
    await db.insert(customers).values({
      address: '44 rue Hors Scope, Paris',
      company: 'Other Scope SAS',
      email: 'other@testco.fr',
      id: otherCustomerId,
      name: 'Other Customer',
      phone: '+33 6 00 00 00 00',
    })

    const scopedInvoice = await service.createDraft({
      customerId: TEST_CUSTOMER_ID,
      dueDate: '2026-04-30',
      issueDate: '2026-04-01',
      lines: [{ description: 'Scoped line', quantity: 1, unitPrice: 100, vatRate: 20 }],
    })

    const outsideInvoice = await service.createDraft({
      customerId: otherCustomerId,
      dueDate: '2026-05-30',
      issueDate: '2026-05-01',
      lines: [{ description: 'Outside line', quantity: 1, unitPrice: 100, vatRate: 20 }],
    })

    const visible = await service.getInvoiceForListScope(scopedInvoice.id, {
      customerId: TEST_CUSTOMER_ID,
      dateFilter: { endDate: '2026-04-30', startDate: '2026-04-01' },
    })
    const wrongCustomer = await service.getInvoiceForListScope(outsideInvoice.id, {
      customerId: TEST_CUSTOMER_ID,
      dateFilter: { endDate: '2026-05-31', startDate: '2026-05-01' },
    })
    const wrongDate = await service.getInvoiceForListScope(outsideInvoice.id, {
      customerId: otherCustomerId,
      dateFilter: { endDate: '2026-04-30', startDate: '2026-04-01' },
    })

    assert.isNotNull(visible)
    assert.isNull(wrongCustomer)
    assert.isNull(wrongDate)
  })

  test('invoice summary uses the injected business date for overdue computation', async ({
    assert,
  }) => {
    const creationService = new InvoiceService(db, {
      businessCalendar: new FixedBusinessCalendar('2026-04-01'),
    })

    const draft = await creationService.createDraft({
      customerId: TEST_CUSTOMER_ID,
      dueDate: '2026-04-01',
      issueDate: '2026-03-15',
      lines: [{ description: 'Overdue boundary', quantity: 1, unitPrice: 100, vatRate: 20 }],
    })

    await creationService.issueInvoice(draft.id, issuePayload())

    const sameDaySummary = await new InvoiceService(db, {
      businessCalendar: new FixedBusinessCalendar('2026-04-01'),
    }).getInvoiceSummary()
    const nextDaySummary = await new InvoiceService(db, {
      businessCalendar: new FixedBusinessCalendar('2026-04-02'),
    }).getInvoiceSummary()

    assert.equal(sameDaySummary.overdueCount, 0)
    assert.equal(nextDaySummary.overdueCount, 1)
  })

  test('issue succeeds even when customer has no address', async ({ assert, client }) => {
    const draft = await createDraftViaHttp(client)

    await db.update(customers).set({ address: '' }).where(eq(customers.id, TEST_CUSTOMER_ID))

    await client
      .post(`/invoices/${draft.id}/issue`)
      .header('cookie', authCookie())
      .redirects(0)
      .form(issuePayload())

    const [row] = await db.select().from(invoices).where(eq(invoices.id, draft.id))
    assert.equal(row.status, 'issued')
  })

  test('issue is rejected when issued company fields are missing', async ({ assert, client }) => {
    const draft = await createDraftViaHttp(client)

    await client
      .post(`/invoices/${draft.id}/issue`)
      .header('cookie', authCookie())
      .redirects(0)
      .form({
        issuedCompanyAddress: '',
        issuedCompanyName: '',
      })

    const [row] = await db.select().from(invoices).where(eq(invoices.id, draft.id))
    assert.equal(row.status, 'draft')
    assert.equal(row.issuedCompanyName, '')
    assert.equal(row.issuedCompanyAddress, '')
  })

  test('customer snapshot is immutable after issue', async ({ assert, client }) => {
    const customerService = new CustomerService(db)
    const draft = await createDraftViaHttp(client)

    await client
      .post(`/invoices/${draft.id}/issue`)
      .header('cookie', authCookie())
      .redirects(0)
      .form(issuePayload())

    await customerService.updateCustomer(TEST_CUSTOMER_ID, {
      address: '12 avenue de France, 75013 Paris',
      company: 'Renamed Company SAS',
      email: 'renamed@testco.fr',
      name: 'Renamed Contact',
      phone: '+33 6 98 76 54 32',
    })

    const [issued] = await db.select().from(invoices).where(eq(invoices.id, draft.id))
    assert.equal(issued.status, 'issued')
    assert.equal(issued.customerCompanyName, 'Test Company SAS')
    assert.equal(issued.customerCompanySnapshot, 'Test Company SAS')
    assert.equal(issued.customerPrimaryContactSnapshot, 'Alice Martin')
    assert.equal(issued.customerEmailSnapshot, 'contact@testco.fr')
    assert.equal(issued.customerPhoneSnapshot, '+33 6 12 34 56 78')
    assert.equal(issued.customerCompanyAddressSnapshot, '10 rue de la Paix, 75002 Paris')
    assert.equal(issued.issuedCompanyName, 'Issued Company Name')
    assert.equal(issued.issuedCompanyAddress, "10 rue de l'Emission\n75002 Paris")
  })

  test('customer snapshot stays synced for draft invoices', async ({ assert, client }) => {
    const customerService = new CustomerService(db)
    const draft = await createDraftViaHttp(client)

    await customerService.updateCustomer(TEST_CUSTOMER_ID, {
      address: '99 boulevard Voltaire, 75011 Paris',
      company: 'Draft Sync Company',
      email: 'draft-sync@testco.fr',
      name: 'Draft Contact',
      phone: '+33 6 00 11 22 33',
    })

    const [updatedDraft] = await db.select().from(invoices).where(eq(invoices.id, draft.id))
    assert.equal(updatedDraft.status, 'draft')
    assert.equal(updatedDraft.customerCompanyName, 'Draft Sync Company')
    assert.equal(updatedDraft.customerCompanySnapshot, 'Draft Sync Company')
    assert.equal(updatedDraft.customerPrimaryContactSnapshot, 'Draft Contact')
    assert.equal(updatedDraft.customerEmailSnapshot, 'draft-sync@testco.fr')
    assert.equal(updatedDraft.customerPhoneSnapshot, '+33 6 00 11 22 33')
    assert.equal(updatedDraft.customerCompanyAddressSnapshot, '99 boulevard Voltaire, 75011 Paris')
  })

  test('concurrent mark-paid requests keep a single valid paid transition', async ({
    assert,
    client,
  }) => {
    // Simultaneity test model:
    // - read phase is diagnostic
    // - conditional write arbitrates the winner
    // - transaction keeps winner workflow atomic
    const draft = await createDraftViaHttp(client)
    const service = new InvoiceService(db)

    await service.issueInvoice(draft.id, issuePayload())
    const results = await runSimultaneously([
      (waitAtBarrier) => service.markInvoicePaid(draft.id, { afterRead: waitAtBarrier }),
      (waitAtBarrier) => service.markInvoicePaid(draft.id, { afterRead: waitAtBarrier }),
    ])
    assert.equal(
      results.filter((result) => result.status === 'fulfilled').length,
      1,
      'only one mark-paid should win in simultaneous execution'
    )

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

  test('concurrent update-draft requests keep invoice data consistent', async ({
    assert,
    client,
  }) => {
    // Simultaneity test model:
    // - read phase is diagnostic
    // - conditional write arbitrates each commit point
    // - transaction keeps each committed workflow atomic
    const draft = await createDraftViaHttp(client)
    const service = new InvoiceService(db)
    const baseDate = new Date(draft.createdAt)
    const issueDateA = new Date(baseDate)
    issueDateA.setDate(issueDateA.getDate() + 1)
    const dueDateA = new Date(baseDate)
    dueDateA.setDate(dueDateA.getDate() + 20)
    const issueDateB = new Date(baseDate)
    issueDateB.setDate(issueDateB.getDate() + 2)
    const dueDateB = new Date(baseDate)
    dueDateB.setDate(dueDateB.getDate() + 25)
    const issueDateAStr = issueDateA.toISOString().slice(0, 10)
    const dueDateAStr = dueDateA.toISOString().slice(0, 10)
    const issueDateBStr = issueDateB.toISOString().slice(0, 10)
    const dueDateBStr = dueDateB.toISOString().slice(0, 10)

    const results = await runSimultaneously([
      (waitAtBarrier) =>
        service.updateDraft(
          draft.id,
          {
            customerId: TEST_CUSTOMER_ID,
            dueDate: dueDateAStr,
            issueDate: issueDateAStr,
            lines: [
              { description: 'Concurrent update A', quantity: 1, unitPrice: 200, vatRate: 20 },
            ],
          },
          { afterRead: waitAtBarrier }
        ),
      (waitAtBarrier) =>
        service.updateDraft(
          draft.id,
          {
            customerId: TEST_CUSTOMER_ID,
            dueDate: dueDateBStr,
            issueDate: issueDateBStr,
            lines: [
              { description: 'Concurrent update B', quantity: 3, unitPrice: 150, vatRate: 10 },
            ],
          },
          { afterRead: waitAtBarrier }
        ),
    ])
    const fulfilledCount = results.filter((result) => result.status === 'fulfilled').length
    assert.isTrue(fulfilledCount >= 1, 'at least one concurrent update must commit')

    const [row] = await db.select().from(invoices).where(eq(invoices.id, draft.id))
    assert.equal(row.status, 'draft')

    const finalOptions = [
      {
        description: 'Concurrent update A',
        dueDate: dueDateAStr,
        issueDate: issueDateAStr,
        subtotalExclTaxCents: 20_000,
        totalInclTaxCents: 24_000,
        totalVatCents: 4_000,
      },
      {
        description: 'Concurrent update B',
        dueDate: dueDateBStr,
        issueDate: issueDateBStr,
        subtotalExclTaxCents: 45_000,
        totalInclTaxCents: 49_500,
        totalVatCents: 4_500,
      },
      {
        description: 'Consulting services',
        dueDate: draft.dueDate,
        issueDate: draft.issueDate,
        subtotalExclTaxCents: 100_000,
        totalInclTaxCents: 120_000,
        totalVatCents: 20_000,
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
    assert.include(
      ['Concurrent update A', 'Concurrent update B', 'Consulting services'],
      lines[0].description
    )
  })

  test('customer update propagates snapshot to drafts but not to issued invoices', async ({
    assert,
    client,
  }) => {
    const customerService = new CustomerService(db)

    // Create and issue a first invoice — snapshot must freeze at issue time
    const issuedDraft = await createDraftViaHttp(client)
    await client
      .post(`/invoices/${issuedDraft.id}/issue`)
      .header('cookie', authCookie())
      .redirects(0)
      .form(issuePayload())

    // Rename the customer
    await customerService.updateCustomer(TEST_CUSTOMER_ID, {
      address: 'Updated Address, Paris',
      company: 'Updated Company SAS',
      email: 'updated@testco.fr',
      name: 'Updated Contact',
      phone: '+33 6 11 22 33 44',
    })

    // Create a second draft — snapshot must reflect the updated customer
    await createDraftViaHttp(client)
    const [issuedRow] = await db.select().from(invoices).where(eq(invoices.id, issuedDraft.id))
    const [draftRow] = await db.select().from(invoices).where(eq(invoices.status, 'draft'))

    // Issued invoice keeps original snapshot
    assert.equal(issuedRow.customerCompanyName, 'Test Company SAS')
    assert.equal(issuedRow.customerCompanySnapshot, 'Test Company SAS')
    assert.equal(issuedRow.customerPrimaryContactSnapshot, 'Alice Martin')
    assert.equal(issuedRow.customerEmailSnapshot, 'contact@testco.fr')
    assert.equal(issuedRow.customerPhoneSnapshot, '+33 6 12 34 56 78')
    assert.equal(issuedRow.customerCompanyAddressSnapshot, '10 rue de la Paix, 75002 Paris')

    // New draft has the updated snapshot
    assert.equal(draftRow.customerCompanyName, 'Updated Company SAS')
    assert.equal(draftRow.customerCompanySnapshot, 'Updated Company SAS')
    assert.equal(draftRow.customerPrimaryContactSnapshot, 'Updated Contact')
    assert.equal(draftRow.customerEmailSnapshot, 'updated@testco.fr')
    assert.equal(draftRow.customerPhoneSnapshot, '+33 6 11 22 33 44')
    assert.equal(draftRow.customerCompanyAddressSnapshot, 'Updated Address, Paris')
  })
})
