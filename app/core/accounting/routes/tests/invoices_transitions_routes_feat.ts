import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { CustomerService } from '#core/accounting/application/customers/index'
import { customers, invoices, journalEntries } from '#core/accounting/drizzle/schema'
import { member } from '#core/user_management/drizzle/schema'
import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'
import { eq } from 'drizzle-orm'

import { setupTestDatabaseForGroup } from '../../../../../tests/helpers/testcontainers_db.js'
import {
  authCookie,
  bindInvoiceAuth,
  createDraftViaHttp,
  issuePayload,
  resetInvoiceAuthContext,
  resetInvoiceFixtures,
  seedInvoiceActor,
  seedTestOrganization,
  setInvoiceActorRole,
  TEST_ACCOUNTING_ACCESS_CONTEXT,
  TEST_CUSTOMER_ID,
} from './invoices_test_support.js'

let db: PostgresJsDatabase<any>

test.group(
  'Invoices routes | POST /invoices/:id/issue, POST /invoices/:id/mark-paid, DELETE /invoices/:id',
  (group) => {
    let cleanup: () => Promise<void>

    group.setup(async () => {
      const ctx = await setupTestDatabaseForGroup()
      cleanup = ctx.cleanup
      db = await app.container.make('drizzle')
      await seedTestOrganization(db)
      await seedInvoiceActor(db)
    })

    group.each.setup(async () => {
      resetInvoiceAuthContext()
      bindInvoiceAuth()
      await resetInvoiceFixtures(db)
      await setInvoiceActorRole(db, 'admin')
    })

    group.teardown(async () => cleanup())

    test('contract:DELETE /invoices/:id happy path', async ({ assert, client }) => {
      const draft = await createDraftViaHttp(db, client)

      const deleteResponse = await client
        .delete(`/invoices/${draft.id}`)
        .header('cookie', authCookie())
        .redirects(0)

      deleteResponse.assertStatus(302)

      const rows = await db.select().from(invoices).where(eq(invoices.id, draft.id))
      assert.equal(rows.length, 0)
    })

    test('contract:POST /invoices/:id/mark-paid happy path', async ({
      assert,
      client,
    }) => {
      const draft = await createDraftViaHttp(db, client)

      await client
        .post(`/invoices/${draft.id}/issue`)
        .header('cookie', authCookie())
        .redirects(0)
        .form(issuePayload())

      const response = await client
        .post(`/invoices/${draft.id}/mark-paid`)
        .header('cookie', authCookie())
        .redirects(0)

      response.assertStatus(302)

      const [row] = await db.select().from(invoices).where(eq(invoices.id, draft.id))
      assert.equal(row.status, 'paid')
    })

    test('contract:member can read invoices but cannot mark an invoice as paid', async ({
      assert,
      client,
    }) => {
      await setInvoiceActorRole(db, 'member')
      const draft = await createDraftViaHttp(db, client)

      await db
        .update(member)
        .set({ role: 'admin' })
        .where(eq(member.userId, TEST_ACCOUNTING_ACCESS_CONTEXT.actorId!))
      await client
        .post(`/invoices/${draft.id}/issue`)
        .header('cookie', authCookie())
        .redirects(0)
        .form(issuePayload())
      await setInvoiceActorRole(db, 'member')

      const listResponse = await client
        .get('/invoices')
        .header('cookie', authCookie())
        .header('x-inertia', 'true')
        .header('x-inertia-version', '1')

      listResponse.assertStatus(200)
      assert.isFalse(listResponse.body().props.canViewAuditHistory)

      const response = await client
        .post(`/invoices/${draft.id}/mark-paid`)
        .header('cookie', authCookie())
        .redirects(0)

      response.assertStatus(302)

      const [row] = await db.select().from(invoices).where(eq(invoices.id, draft.id))
      assert.equal(row.status, 'issued')
    })

    test('contract:POST /invoices/:id/issue happy path via HTTP', async ({ assert, client }) => {
      await setInvoiceActorRole(db, 'admin')
      const draft = await createDraftViaHttp(db, client)

      const response = await client
        .post(`/invoices/${draft.id}/issue`)
        .header('cookie', authCookie())
        .redirects(0)
        .form(issuePayload())

      response.assertStatus(302)

      const [row] = await db.select().from(invoices).where(eq(invoices.id, draft.id))
      assert.equal(row.status, 'issued')
    })

    test('contract:inactive membership cannot create, update, or delete draft invoices', async ({
      assert,
      client,
    }) => {
      await setInvoiceActorRole(db, 'member', false)

      const createResponse = await client
        .post('/invoices')
        .header('cookie', authCookie())
        .redirects(0)
        .form({
          customerId: TEST_CUSTOMER_ID,
          dueDate: '2099-06-01',
          issueDate: '2099-05-01',
          'lines[0][description]': 'Blocked draft',
          'lines[0][quantity]': 1,
          'lines[0][unitPrice]': 100,
          'lines[0][vatRate]': 20,
        })

      createResponse.assertStatus(302)
      assert.lengthOf(await db.select().from(invoices), 0)

      await setInvoiceActorRole(db, 'admin')
      const draft = await createDraftViaHttp(db, client)
      await setInvoiceActorRole(db, 'member', false)

      const updateResponse = await client
        .put(`/invoices/${draft.id}/draft`)
        .header('cookie', authCookie())
        .redirects(0)
        .form({
          customerId: TEST_CUSTOMER_ID,
          dueDate: '2099-06-15',
          issueDate: '2099-05-15',
          'lines[0][description]': 'Blocked update',
          'lines[0][quantity]': 2,
          'lines[0][unitPrice]': 200,
          'lines[0][vatRate]': 20,
        })

      updateResponse.assertStatus(302)

      const deleteResponse = await client
        .delete(`/invoices/${draft.id}`)
        .header('cookie', authCookie())
        .redirects(0)

      deleteResponse.assertStatus(302)

      const [row] = await db.select().from(invoices).where(eq(invoices.id, draft.id))
      assert.equal(row.issueDate, draft.issueDate)

      const rows = await db.select().from(invoices).where(eq(invoices.id, draft.id))
      assert.equal(rows.length, 1)
    })

    test('contract:POST /invoices/:id/issue preserves customer scope in redirect query', async ({
      assert,
      client,
    }) => {
      const draft = await createDraftViaHttp(db, client)

      const response = await client
        .post(`/invoices/${draft.id}/issue?customer=${TEST_CUSTOMER_ID}&perPage=25&search=alpha`)
        .header('cookie', authCookie())
        .redirects(0)
        .form(issuePayload())

      response.assertStatus(302)
      response.assertHeader(
        'location',
        `/invoices?perPage=25&invoice=${draft.id}&customer=${TEST_CUSTOMER_ID}&search=alpha`
      )

      const [issued] = await db.select().from(invoices).where(eq(invoices.id, draft.id))
      assert.equal(issued.status, 'issued')
    })

  }
)
