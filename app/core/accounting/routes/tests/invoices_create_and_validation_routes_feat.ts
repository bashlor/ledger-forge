import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { InvoiceService } from '#core/accounting/application/invoices/index'
import { SYSTEM_ACCOUNTING_ACCESS_CONTEXT } from '#core/accounting/application/support/access_context'
import { invoiceLines, invoices } from '#core/accounting/drizzle/schema'
import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'
import { eq } from 'drizzle-orm'

import { setupTestDatabaseForGroup } from '../../../../../tests/helpers/testcontainers_db.js'
import {
  authCookie,
  bindInvoiceAuth,
  createDraftViaHttp,
  resetInvoiceFixtures,
  TEST_CUSTOMER_ID,
} from './invoices_test_support.js'

let db: PostgresJsDatabase<any>

test.group('Invoices routes | POST /invoices, PUT /invoices/:id', (group) => {
  let cleanup: () => Promise<void>

  group.setup(async () => {
    const ctx = await setupTestDatabaseForGroup()
    cleanup = ctx.cleanup
    db = await app.container.make('drizzle')
    bindInvoiceAuth()
  })

  group.each.setup(async () => {
    await resetInvoiceFixtures(db)
  })

  group.teardown(async () => cleanup())

  test('POST /invoices recalculates totals server-side (body totals are ignored)', async ({
    assert,
    client,
  }) => {
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

  test('POST /invoices rejects draft creation when dueDate is before issueDate', async ({
    assert,
    client,
  }) => {
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

  test('POST /invoices rejects draft creation when dueDate is before today', async ({
    assert,
    client,
  }) => {
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

  test('PUT /invoices/:id rejects updateDraft when dueDate is before draft creation date', async ({
    assert,
    client,
  }) => {
    const draft = await createDraftViaHttp(db, client)
    const service = new InvoiceService(db)

    const createdAtDate = draft.createdAt.toISOString().slice(0, 10)
    const previousDay = new Date(draft.createdAt)
    previousDay.setDate(previousDay.getDate() - 1)
    const dueDateBeforeCreation = previousDay.toISOString().slice(0, 10)

    let didThrow = false
    try {
      await service.updateDraft(
        draft.id,
        {
          customerId: TEST_CUSTOMER_ID,
          dueDate: dueDateBeforeCreation,
          issueDate: '2020-01-01',
          lines: [{ description: 'Updated line', quantity: 1, unitPrice: 100, vatRate: 20 }],
        },
        SYSTEM_ACCOUNTING_ACCESS_CONTEXT
      )
    } catch {
      didThrow = true
    }
    assert.isTrue(didThrow)

    const [unchanged] = await db.select().from(invoices).where(eq(invoices.id, draft.id))
    assert.equal(unchanged.dueDate, draft.dueDate)
    assert.equal(createdAtDate <= (unchanged.dueDate ?? ''), true)
  })
})
