import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { invoices } from '#core/accounting/drizzle/schema'
import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'
import { count } from 'drizzle-orm'

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

    const [{ total }] = await db.select({ total: count() }).from(invoices)
    assert.equal(total, 1)
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
    const body = response.body()
    assert.lengthOf(body.lines, 2)
    assert.property(body, 'subtotalExclTax')
    assert.property(body, 'totalInclTax')
    assert.property(body, 'totalVat')

    const [{ total }] = await db.select({ total: count() }).from(invoices)
    assert.equal(total, 0)
  })
})
