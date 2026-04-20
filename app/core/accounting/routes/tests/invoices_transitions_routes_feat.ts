import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { CustomerService } from '#core/accounting/application/customers/index'
import { customers, invoices, journalEntries } from '#core/accounting/drizzle/schema'
import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'
import { eq } from 'drizzle-orm'

import { setupTestDatabaseForGroup } from '../../../../../tests/helpers/testcontainers_db.js'
import {
  authCookie,
  bindInvoiceAuth,
  createDraftViaHttp,
  issuePayload,
  resetInvoiceFixtures,
  seedTestOrganization,
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
      bindInvoiceAuth()
    })

    group.each.setup(async () => {
      await resetInvoiceFixtures(db)
    })

    group.teardown(async () => cleanup())

    test('POST /invoices/:id/issue is irreversible once invoice is issued', async ({
      assert,
      client,
    }) => {
      const draft = await createDraftViaHttp(db, client)

      const issueResponse = await client
        .post(`/invoices/${draft.id}/issue`)
        .header('cookie', authCookie())
        .redirects(0)
        .form(issuePayload())

      issueResponse.assertStatus(302)

      const [issued] = await db.select().from(invoices).where(eq(invoices.id, draft.id))
      assert.equal(issued.status, 'issued')

      await client
        .post(`/invoices/${draft.id}/issue`)
        .header('cookie', authCookie())
        .redirects(0)
        .form(issuePayload())

      const [stillIssued] = await db.select().from(invoices).where(eq(invoices.id, draft.id))
      assert.equal(stillIssued.status, 'issued')
    })

    test('DELETE /invoices/:id only deletes draft invoices', async ({ assert, client }) => {
      const draft = await createDraftViaHttp(db, client)

      await client
        .post(`/invoices/${draft.id}/issue`)
        .header('cookie', authCookie())
        .redirects(0)
        .form(issuePayload())

      const deleteResponse = await client
        .delete(`/invoices/${draft.id}`)
        .header('cookie', authCookie())
        .redirects(0)

      deleteResponse.assertStatus(302)

      const rows = await db.select().from(invoices)
      assert.equal(rows.length, 1, 'issued invoice was not deleted')
      assert.equal(rows[0].status, 'issued')
    })

    test('POST /invoices/:id/issue creates a journal entry', async ({ assert, client }) => {
      const draft = await createDraftViaHttp(db, client)

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

    test('POST /invoices/:id/mark-paid is rejected for a draft invoice', async ({
      assert,
      client,
    }) => {
      const draft = await createDraftViaHttp(db, client)

      await client
        .post(`/invoices/${draft.id}/mark-paid`)
        .header('cookie', authCookie())
        .redirects(0)
        .form(issuePayload())

      const [row] = await db.select().from(invoices).where(eq(invoices.id, draft.id))
      assert.equal(row.status, 'draft', 'draft invoice was not changed to paid')
    })

    test('POST /invoices/:id/mark-paid marks an issued invoice as paid', async ({
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

    test('POST /invoices/:id/issue preserves customer scope in redirect query', async ({
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

    test('POST /invoices/:id/issue succeeds even when customer has no address', async ({
      assert,
      client,
    }) => {
      const draft = await createDraftViaHttp(db, client)

      await db.update(customers).set({ address: '' }).where(eq(customers.id, TEST_CUSTOMER_ID))

      await client
        .post(`/invoices/${draft.id}/issue`)
        .header('cookie', authCookie())
        .redirects(0)
        .form(issuePayload())

      const [row] = await db.select().from(invoices).where(eq(invoices.id, draft.id))
      assert.equal(row.status, 'issued')
    })

    test('POST /invoices/:id/issue is rejected when issued company fields are missing', async ({
      assert,
      client,
    }) => {
      const draft = await createDraftViaHttp(db, client)

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

    test('issued invoice snapshot stays immutable after customer update', async ({
      assert,
      client,
    }) => {
      const customerService = new CustomerService(db)
      const draft = await createDraftViaHttp(db, client)

      await client
        .post(`/invoices/${draft.id}/issue`)
        .header('cookie', authCookie())
        .redirects(0)
        .form(issuePayload())

      await customerService.updateCustomer(
        TEST_CUSTOMER_ID,
        {
          address: '12 avenue de France, 75013 Paris',
          company: 'Renamed Company SAS',
          email: 'renamed@testco.fr',
          name: 'Renamed Contact',
          phone: '+33 6 98 76 54 32',
        },
        TEST_ACCOUNTING_ACCESS_CONTEXT
      )

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

    test('draft invoice snapshot stays synced after customer update', async ({
      assert,
      client,
    }) => {
      const customerService = new CustomerService(db)
      const draft = await createDraftViaHttp(db, client)

      await customerService.updateCustomer(
        TEST_CUSTOMER_ID,
        {
          address: '99 boulevard Voltaire, 75011 Paris',
          company: 'Draft Sync Company',
          email: 'draft-sync@testco.fr',
          name: 'Draft Contact',
          phone: '+33 6 00 11 22 33',
        },
        TEST_ACCOUNTING_ACCESS_CONTEXT
      )

      const [updatedDraft] = await db.select().from(invoices).where(eq(invoices.id, draft.id))
      assert.equal(updatedDraft.status, 'draft')
      assert.equal(updatedDraft.customerCompanyName, 'Draft Sync Company')
      assert.equal(updatedDraft.customerCompanySnapshot, 'Draft Sync Company')
      assert.equal(updatedDraft.customerPrimaryContactSnapshot, 'Draft Contact')
      assert.equal(updatedDraft.customerEmailSnapshot, 'draft-sync@testco.fr')
      assert.equal(updatedDraft.customerPhoneSnapshot, '+33 6 00 11 22 33')
      assert.equal(
        updatedDraft.customerCompanyAddressSnapshot,
        '99 boulevard Voltaire, 75011 Paris'
      )
    })

    test('customer update propagates snapshot to drafts but not to issued invoices', async ({
      assert,
      client,
    }) => {
      const customerService = new CustomerService(db)
      const issuedDraft = await createDraftViaHttp(db, client)

      await client
        .post(`/invoices/${issuedDraft.id}/issue`)
        .header('cookie', authCookie())
        .redirects(0)
        .form(issuePayload())

      await customerService.updateCustomer(
        TEST_CUSTOMER_ID,
        {
          address: 'Updated Address, Paris',
          company: 'Updated Company SAS',
          email: 'updated@testco.fr',
          name: 'Updated Contact',
          phone: '+33 6 11 22 33 44',
        },
        TEST_ACCOUNTING_ACCESS_CONTEXT
      )

      await createDraftViaHttp(db, client)
      const [issuedRow] = await db.select().from(invoices).where(eq(invoices.id, issuedDraft.id))
      const [draftRow] = await db.select().from(invoices).where(eq(invoices.status, 'draft'))

      assert.equal(issuedRow.customerCompanyName, 'Test Company SAS')
      assert.equal(issuedRow.customerCompanySnapshot, 'Test Company SAS')
      assert.equal(issuedRow.customerPrimaryContactSnapshot, 'Alice Martin')
      assert.equal(issuedRow.customerEmailSnapshot, 'contact@testco.fr')
      assert.equal(issuedRow.customerPhoneSnapshot, '+33 6 12 34 56 78')
      assert.equal(issuedRow.customerCompanyAddressSnapshot, '10 rue de la Paix, 75002 Paris')

      assert.equal(draftRow.customerCompanyName, 'Updated Company SAS')
      assert.equal(draftRow.customerCompanySnapshot, 'Updated Company SAS')
      assert.equal(draftRow.customerPrimaryContactSnapshot, 'Updated Contact')
      assert.equal(draftRow.customerEmailSnapshot, 'updated@testco.fr')
      assert.equal(draftRow.customerPhoneSnapshot, '+33 6 11 22 33 44')
      assert.equal(draftRow.customerCompanyAddressSnapshot, 'Updated Address, Paris')
    })
  }
)
