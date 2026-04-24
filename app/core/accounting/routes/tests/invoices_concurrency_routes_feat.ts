import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { invoices } from '#core/accounting/drizzle/schema'
import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'

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

test.group('Invoices routes | boundary concurrency smoke', (group) => {
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

  test('contract:POST /invoices concurrent requests still produce unique invoice numbers', async ({
    assert,
    client,
  }) => {
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
    const year = new Date().getFullYear()
    assert.equal(new Set(invoiceNumbers).size, 2)
    assert.include(invoiceNumbers, `INV-${year}-001`)
    assert.include(invoiceNumbers, `INV-${year}-002`)
  })
})
