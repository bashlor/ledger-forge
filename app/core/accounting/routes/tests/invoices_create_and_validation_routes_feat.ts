import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { invoiceLines, invoices } from '#core/accounting/drizzle/schema'
import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'
import { eq } from 'drizzle-orm'

import { setupTestDatabaseForGroup } from '../../../../../tests/helpers/testcontainers_db.js'
import {
  authCookie,
  bindInvoiceAuth,
  resetInvoiceAuthContext,
  resetInvoiceFixtures,
  seedInvoiceActor,
  seedTestOrganization,
  TEST_CUSTOMER_ID,
} from './invoices_test_support.js'

let db: PostgresJsDatabase<any>

test.group('Invoices routes | POST /invoices, PUT /invoices/:id', (group) => {
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
  })

  group.teardown(async () => cleanup())

  test('contract:POST /invoices happy path returns redirect', async ({ assert, client }) => {
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
})
