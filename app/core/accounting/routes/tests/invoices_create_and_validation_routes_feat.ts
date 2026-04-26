import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { invoiceLines, invoices } from '#core/accounting/drizzle/schema'
import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'
import { count, eq } from 'drizzle-orm'

import { setupTestDatabaseForGroup } from '../../../../../tests/helpers/testcontainers_db.js'
import {
  authCookie,
  bindInvoiceAuth,
  resetInvoiceAuthContext,
  resetInvoiceFixtures,
  seedInvoiceActor,
  seedTestOrganization,
  TEST_ACCOUNTING_ACCESS_CONTEXT,
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
    assert.equal(lines[0].organizationId, TEST_ACCOUNTING_ACCESS_CONTEXT.tenantId)
    assert.equal(lines[0].lineTotalExclTaxCents, 100_000)
    assert.equal(lines[0].lineTotalVatCents, 20_000)
    assert.equal(lines[0].lineTotalInclTaxCents, 120_000)
  })

  test('contract:POST /invoices/preview returns calculated totals without persistence', async ({
    assert,
    client,
  }) => {
    const response = await client
      .post('/invoices/preview')
      .header('cookie', authCookie())
      .json({
        lines: [
          { description: 'Consulting', quantity: 2.5, unitPrice: 19.99, vatRate: 20 },
          { description: 'Reduced VAT', quantity: 1, unitPrice: 100, vatRate: 5.5 },
        ],
      })

    response.assertStatus(200)
    assert.deepEqual(response.body(), {
      lines: [
        {
          description: 'Consulting',
          lineTotalExclTax: 49.98,
          lineTotalInclTax: 59.98,
          lineVatAmount: 10,
          quantity: 2.5,
          unitPrice: 19.99,
          vatRate: 20,
        },
        {
          description: 'Reduced VAT',
          lineTotalExclTax: 100,
          lineTotalInclTax: 105.5,
          lineVatAmount: 5.5,
          quantity: 1,
          unitPrice: 100,
          vatRate: 5.5,
        },
      ],
      subtotalExclTax: 149.98,
      totalInclTax: 165.48,
      totalVat: 15.5,
    })

    const [{ total }] = await db.select({ total: count() }).from(invoices)
    assert.equal(total, 0)
  })
})
