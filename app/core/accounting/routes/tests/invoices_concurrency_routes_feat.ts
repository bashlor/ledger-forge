import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { invoiceLines, invoices, journalEntries } from '#core/accounting/drizzle/schema'
import { InvoiceService } from '#core/accounting/services/invoice_service'
import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'
import { eq } from 'drizzle-orm'

import { runSimultaneously } from '../../../../../tests/helpers/concurrency_barrier.js'
import { setupTestDatabaseForGroup } from '../../../../../tests/helpers/testcontainers_db.js'
import {
  authCookie,
  bindInvoiceAuth,
  createDraftViaHttp,
  issuePayload,
  resetInvoiceFixtures,
  TEST_CUSTOMER_ID,
} from './invoices_test_support.js'

let db: PostgresJsDatabase<any>

test.group('Invoices routes | concurrency', (group) => {
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

  test('POST /invoices concurrent draft creation generates unique invoice numbers', async ({
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

  test('POST /invoices/:id/issue concurrent requests create only one journal entry', async ({
    assert,
    client,
  }) => {
    const draft = await createDraftViaHttp(db, client)
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

  test('POST /invoices/:id/mark-paid concurrent requests keep a single valid paid transition', async ({
    assert,
    client,
  }) => {
    const draft = await createDraftViaHttp(db, client)
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

  test('DELETE /invoices/:id concurrent delete-draft requests leave no invoice row', async ({
    assert,
    client,
  }) => {
    const draft = await createDraftViaHttp(db, client)

    await Promise.allSettled([
      client.delete(`/invoices/${draft.id}`).header('cookie', authCookie()).redirects(0),
      client.delete(`/invoices/${draft.id}`).header('cookie', authCookie()).redirects(0),
    ])

    const rows = await db.select().from(invoices).where(eq(invoices.id, draft.id))
    assert.equal(rows.length, 0)
  })

  test('PUT /invoices/:id concurrent update-draft requests keep invoice data consistent', async ({
    assert,
    client,
  }) => {
    const draft = await createDraftViaHttp(db, client)
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
})
