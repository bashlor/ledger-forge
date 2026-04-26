import type { AccountingAccessContext } from '#core/accounting/application/support/access_context'
import type { AccountingBusinessCalendar } from '#core/accounting/application/support/business_calendar'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { listAuditEventsForEntity } from '#core/accounting/application/audit/audit_queries'
import { InvoiceService } from '#core/accounting/application/invoices/index'
import {
  auditEvents,
  customers,
  invoiceLines,
  invoices,
  journalEntries,
} from '#core/accounting/drizzle/schema'
import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'
import { eq } from 'drizzle-orm'

import { runSimultaneously } from '../../../../../tests/helpers/concurrency_barrier.js'
import {
  seedTestOrganization,
  setupTestDatabaseForGroup,
  TEST_TENANT_ID,
} from '../../../../../tests/helpers/testcontainers_db.js'

const TEST_CUSTOMER_ID = 'invoice-service-test-customer'
const SECOND_CUSTOMER_ID = 'invoice-service-test-customer-2'

const TEST_ACCOUNTING_ACCESS_CONTEXT: AccountingAccessContext = {
  actorId: 'test_actor',
  isAnonymous: false,
  requestId: 'test',
  tenantId: TEST_TENANT_ID,
}

test.group('Invoice service integration', (group) => {
  let cleanup: () => Promise<void>
  let db: PostgresJsDatabase<any>

  group.setup(async () => {
    const ctx = await setupTestDatabaseForGroup()
    cleanup = ctx.cleanup
    db = await app.container.make('drizzle')
    await seedTestOrganization(db)
  })

  group.each.setup(async () => {
    await db.delete(auditEvents)
    await db.delete(journalEntries)
    await db.delete(invoiceLines)
    await db.delete(invoices)
    await db.delete(customers)

    await db.insert(customers).values([
      {
        address: '10 rue de la Paix, 75002 Paris',
        company: 'Invoice Test Company',
        email: 'billing@testco.fr',
        id: TEST_CUSTOMER_ID,
        name: 'Alice Martin',
        organizationId: TEST_TENANT_ID,
        phone: '+33 6 12 34 56 78',
      },
      {
        address: '42 avenue des Clients, 69000 Lyon',
        company: 'Invoice Test Company 2',
        email: 'second@testco.fr',
        id: SECOND_CUSTOMER_ID,
        name: 'Bob Martin',
        organizationId: TEST_TENANT_ID,
        phone: '+33 6 98 76 54 32',
      },
    ])
  })

  group.teardown(async () => cleanup())

  test('getInvoiceForListScope does not bypass the customer filter for an explicit invoice id', async ({
    assert,
  }) => {
    const service = new InvoiceService(db)
    const invoice = await service.createDraft(
      {
        customerId: SECOND_CUSTOMER_ID,
        dueDate: '2099-05-01',
        issueDate: '2099-04-01',
        lines: [{ description: 'Consulting', quantity: 1, unitPrice: 100, vatRate: 20 }],
      },
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )

    const scoped = await service.getInvoiceForListScope(
      invoice.id,
      {
        customerId: TEST_CUSTOMER_ID,
        dateFilter: undefined,
      },
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )

    assert.isNull(scoped)
  })

  test('getInvoiceForListScope does not bypass the issue date filter for an explicit invoice id', async ({
    assert,
  }) => {
    const service = new InvoiceService(db)
    const invoice = await service.createDraft(
      {
        customerId: TEST_CUSTOMER_ID,
        dueDate: '2099-05-01',
        issueDate: '2099-04-01',
        lines: [{ description: 'Design', quantity: 1, unitPrice: 100, vatRate: 20 }],
      },
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )

    const scoped = await service.getInvoiceForListScope(
      invoice.id,
      {
        customerId: null,
        dateFilter: { endDate: '2099-04-30', startDate: '2099-04-15' },
      },
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )

    assert.isNull(scoped)
  })

  test('uses the injected business calendar when validating draft creation dates', async ({
    assert,
  }) => {
    const businessCalendar: AccountingBusinessCalendar = {
      dateFromTimestamp(value: Date) {
        return value.toISOString().slice(0, 10)
      },
      today() {
        return '2099-04-10'
      },
    }

    const service = new InvoiceService(db, { businessCalendar })

    await assert.rejects(
      () =>
        service.createDraft(
          {
            customerId: TEST_CUSTOMER_ID,
            dueDate: '2099-04-09',
            issueDate: '2099-04-01',
            lines: [{ description: 'Past due', quantity: 1, unitPrice: 100, vatRate: 20 }],
          },
          TEST_ACCOUNTING_ACCESS_CONTEXT
        ),
      'Due date must be on or after the draft creation date.'
    )

    const accepted = await service.createDraft(
      {
        customerId: TEST_CUSTOMER_ID,
        dueDate: '2099-04-10',
        issueDate: '2099-04-01',
        lines: [{ description: 'On calendar date', quantity: 1, unitPrice: 100, vatRate: 20 }],
      },
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )

    assert.equal(accepted.dueDate, '2099-04-10')
  })

  test('createDraft stores invoice lines with the active tenant id', async ({ assert }) => {
    const service = new InvoiceService(db)
    const draft = await service.createDraft(
      {
        customerId: TEST_CUSTOMER_ID,
        dueDate: '2099-05-01',
        issueDate: '2099-04-01',
        lines: [{ description: 'Tenant-scoped line', quantity: 1, unitPrice: 100, vatRate: 20 }],
      },
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )

    const lines = await db.select().from(invoiceLines).where(eq(invoiceLines.invoiceId, draft.id))

    assert.lengthOf(lines, 1)
    assert.equal(lines[0].organizationId, TEST_TENANT_ID)
  })

  test('updateDraft preserves tenant ownership on replaced invoice lines', async ({ assert }) => {
    const service = new InvoiceService(db)
    const draft = await service.createDraft(
      {
        customerId: TEST_CUSTOMER_ID,
        dueDate: '2099-05-01',
        issueDate: '2099-04-01',
        lines: [{ description: 'Initial line', quantity: 1, unitPrice: 100, vatRate: 20 }],
      },
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )

    await service.updateDraft(
      draft.id,
      {
        customerId: TEST_CUSTOMER_ID,
        dueDate: '2099-05-02',
        issueDate: '2099-04-02',
        lines: [{ description: 'Replacement line', quantity: 2, unitPrice: 100, vatRate: 20 }],
      },
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )

    const lines = await db.select().from(invoiceLines).where(eq(invoiceLines.invoiceId, draft.id))

    assert.lengthOf(lines, 1)
    assert.equal(lines[0].description, 'Replacement line')
    assert.equal(lines[0].organizationId, TEST_TENANT_ID)
  })

  test('getInvoiceSummary remains global when list search is active', async ({ assert }) => {
    const service = new InvoiceService(db)
    await service.createDraft(
      {
        customerId: TEST_CUSTOMER_ID,
        dueDate: '2099-05-01',
        issueDate: '2099-04-01',
        lines: [{ description: 'Cursor design work', quantity: 1, unitPrice: 100, vatRate: 20 }],
      },
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )
    await service.createDraft(
      {
        customerId: SECOND_CUSTOMER_ID,
        dueDate: '2099-05-02',
        issueDate: '2099-04-02',
        lines: [{ description: 'General support', quantity: 1, unitPrice: 100, vatRate: 20 }],
      },
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )

    const filteredList = await service.listInvoices(
      1,
      10,
      TEST_ACCOUNTING_ACCESS_CONTEXT,
      undefined,
      undefined,
      'invoice test company 2'
    )
    const summary = await service.getInvoiceSummary(TEST_ACCOUNTING_ACCESS_CONTEXT)

    assert.equal(filteredList.pagination.totalItems, 1)
    assert.equal(summary.draftCount, 2)
    assert.equal(summary.issuedCount, 0)
    assert.equal(summary.overdueCount, 0)
  })

  test('txn:issueInvoice has a single winner under concurrent execution', async ({ assert }) => {
    const service = new InvoiceService(db)
    const draft = await service.createDraft(
      {
        customerId: TEST_CUSTOMER_ID,
        dueDate: '2099-05-01',
        issueDate: '2099-04-01',
        lines: [{ description: 'Concurrent issue', quantity: 1, unitPrice: 100, vatRate: 20 }],
      },
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )

    const results = await runSimultaneously([
      (waitAtBarrier) =>
        service.issueInvoice(
          draft.id,
          { issuedCompanyAddress: '1 rue Test', issuedCompanyName: 'Test Inc.' },
          TEST_ACCOUNTING_ACCESS_CONTEXT,
          { afterRead: waitAtBarrier }
        ),
      (waitAtBarrier) =>
        service.issueInvoice(
          draft.id,
          { issuedCompanyAddress: '1 rue Test', issuedCompanyName: 'Test Inc.' },
          TEST_ACCOUNTING_ACCESS_CONTEXT,
          { afterRead: waitAtBarrier }
        ),
    ])

    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1)
    const [row] = await db.select().from(invoices).where(eq(invoices.id, draft.id))
    assert.equal(row.status, 'issued')
    const entries = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.invoiceId, draft.id))
    assert.equal(entries.length, 1)
  })

  test('txn:markInvoicePaid has a single winner under concurrent execution', async ({ assert }) => {
    const service = new InvoiceService(db)
    const draft = await service.createDraft(
      {
        customerId: TEST_CUSTOMER_ID,
        dueDate: '2099-05-01',
        issueDate: '2099-04-01',
        lines: [{ description: 'Concurrent paid', quantity: 1, unitPrice: 100, vatRate: 20 }],
      },
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )
    await service.issueInvoice(
      draft.id,
      { issuedCompanyAddress: '1 rue Test', issuedCompanyName: 'Test Inc.' },
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )

    const results = await runSimultaneously([
      (waitAtBarrier) =>
        service.markInvoicePaid(draft.id, TEST_ACCOUNTING_ACCESS_CONTEXT, {
          afterRead: waitAtBarrier,
        }),
      (waitAtBarrier) =>
        service.markInvoicePaid(draft.id, TEST_ACCOUNTING_ACCESS_CONTEXT, {
          afterRead: waitAtBarrier,
        }),
    ])

    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1)
    const [row] = await db.select().from(invoices).where(eq(invoices.id, draft.id))
    assert.equal(row.status, 'paid')
  })

  test('txn:updateDraft concurrent updates converge to one consistent state', async ({
    assert,
  }) => {
    const service = new InvoiceService(db)
    const draft = await service.createDraft(
      {
        customerId: TEST_CUSTOMER_ID,
        dueDate: '2099-05-01',
        issueDate: '2099-04-01',
        lines: [{ description: 'Initial line', quantity: 1, unitPrice: 100, vatRate: 20 }],
      },
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )

    const results = await runSimultaneously([
      (waitAtBarrier) =>
        service.updateDraft(
          draft.id,
          {
            customerId: TEST_CUSTOMER_ID,
            dueDate: '2099-05-12',
            issueDate: '2099-04-03',
            lines: [
              { description: 'Concurrent update A', quantity: 1, unitPrice: 200, vatRate: 20 },
            ],
          },
          TEST_ACCOUNTING_ACCESS_CONTEXT,
          { afterRead: waitAtBarrier }
        ),
      (waitAtBarrier) =>
        service.updateDraft(
          draft.id,
          {
            customerId: TEST_CUSTOMER_ID,
            dueDate: '2099-05-20',
            issueDate: '2099-04-05',
            lines: [
              { description: 'Concurrent update B', quantity: 3, unitPrice: 150, vatRate: 10 },
            ],
          },
          TEST_ACCOUNTING_ACCESS_CONTEXT,
          { afterRead: waitAtBarrier }
        ),
    ])

    assert.isTrue(
      results.some((result) => result.status === 'fulfilled'),
      'at least one concurrent update should commit'
    )

    const [row] = await db.select().from(invoices).where(eq(invoices.id, draft.id))
    assert.equal(row.status, 'draft')
    assert.include(['2099-05-12', '2099-05-20'], row.dueDate)

    const lines = await db
      .select()
      .from(invoiceLines)
      .where(eq(invoiceLines.invoiceId, draft.id))
      .orderBy(invoiceLines.lineNumber)
    assert.equal(lines.length, 1)
    assert.include(['Concurrent update A', 'Concurrent update B'], lines[0].description)
    assert.equal(lines[0].organizationId, TEST_TENANT_ID)
  })

  test('audit:create/update/issue/mark_paid events are emitted on happy path', async ({
    assert,
  }) => {
    const service = new InvoiceService(db)
    const created = await service.createDraft(
      {
        customerId: TEST_CUSTOMER_ID,
        dueDate: '2099-05-01',
        issueDate: '2099-04-01',
        lines: [{ description: 'Audit invoice', quantity: 1, unitPrice: 100, vatRate: 20 }],
      },
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )
    await service.updateDraft(
      created.id,
      {
        customerId: TEST_CUSTOMER_ID,
        dueDate: '2099-05-03',
        issueDate: '2099-04-02',
        lines: [{ description: 'Audit invoice updated', quantity: 2, unitPrice: 100, vatRate: 20 }],
      },
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )
    await service.issueInvoice(
      created.id,
      { issuedCompanyAddress: '1 rue Test', issuedCompanyName: 'Test Inc.' },
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )
    await service.markInvoicePaid(created.id, TEST_ACCOUNTING_ACCESS_CONTEXT)

    const events = await listAuditEventsForEntity(db, {
      entityId: created.id,
      entityType: 'invoice',
      tenantId: TEST_TENANT_ID,
    })
    assert.deepEqual(
      events.map((event) => event.action),
      ['mark_paid', 'issue', 'update_draft', 'create_draft']
    )
  })

  test('listInvoices returns the first page ordered by issueDate desc then invoiceNumber desc', async ({
    assert,
  }) => {
    const service = new InvoiceService(db)
    const draftA = await service.createDraft(
      {
        customerId: TEST_CUSTOMER_ID,
        dueDate: '2099-05-01',
        issueDate: '2099-04-01',
        lines: [{ description: 'A', quantity: 1, unitPrice: 100, vatRate: 20 }],
      },
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )
    const draftB = await service.createDraft(
      {
        customerId: TEST_CUSTOMER_ID,
        dueDate: '2099-05-02',
        issueDate: '2099-04-02',
        lines: [{ description: 'B', quantity: 1, unitPrice: 100, vatRate: 20 }],
      },
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )
    const draftC = await service.createDraft(
      {
        customerId: TEST_CUSTOMER_ID,
        dueDate: '2099-05-03',
        issueDate: '2099-04-03',
        lines: [{ description: 'C', quantity: 1, unitPrice: 100, vatRate: 20 }],
      },
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )
    const draftD = await service.createDraft(
      {
        customerId: TEST_CUSTOMER_ID,
        dueDate: '2099-05-04',
        issueDate: '2099-04-04',
        lines: [{ description: 'D', quantity: 1, unitPrice: 100, vatRate: 20 }],
      },
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )
    const draftE = await service.createDraft(
      {
        customerId: TEST_CUSTOMER_ID,
        dueDate: '2099-05-05',
        issueDate: '2099-04-05',
        lines: [{ description: 'E', quantity: 1, unitPrice: 100, vatRate: 20 }],
      },
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )
    const draftF = await service.createDraft(
      {
        customerId: TEST_CUSTOMER_ID,
        dueDate: '2099-05-06',
        issueDate: '2099-04-06',
        lines: [{ description: 'F', quantity: 1, unitPrice: 100, vatRate: 20 }],
      },
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )

    const result = await service.listInvoices(1, 10, TEST_ACCOUNTING_ACCESS_CONTEXT)

    assert.equal(result.pagination.page, 1)
    assert.equal(result.pagination.perPage, 10)
    assert.equal(result.pagination.totalItems, 6)
    assert.equal(result.pagination.totalPages, 1)
    assert.deepEqual(
      result.items.map((item) => item.id),
      [draftF.id, draftE.id, draftD.id, draftC.id, draftB.id, draftA.id]
    )
  })

  test('listInvoices clamps page when requested page exceeds total pages', async ({ assert }) => {
    const service = new InvoiceService(db)
    const draftA = await service.createDraft(
      {
        customerId: TEST_CUSTOMER_ID,
        dueDate: '2099-06-01',
        issueDate: '2099-05-01',
        lines: [{ description: 'A', quantity: 1, unitPrice: 100, vatRate: 20 }],
      },
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )
    await service.createDraft(
      {
        customerId: TEST_CUSTOMER_ID,
        dueDate: '2099-06-02',
        issueDate: '2099-05-02',
        lines: [{ description: 'B', quantity: 1, unitPrice: 100, vatRate: 20 }],
      },
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )
    await service.createDraft(
      {
        customerId: TEST_CUSTOMER_ID,
        dueDate: '2099-06-03',
        issueDate: '2099-05-03',
        lines: [{ description: 'C', quantity: 1, unitPrice: 100, vatRate: 20 }],
      },
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )
    await service.createDraft(
      {
        customerId: TEST_CUSTOMER_ID,
        dueDate: '2099-06-04',
        issueDate: '2099-05-04',
        lines: [{ description: 'D', quantity: 1, unitPrice: 100, vatRate: 20 }],
      },
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )
    await service.createDraft(
      {
        customerId: TEST_CUSTOMER_ID,
        dueDate: '2099-06-05',
        issueDate: '2099-05-05',
        lines: [{ description: 'E', quantity: 1, unitPrice: 100, vatRate: 20 }],
      },
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )
    await service.createDraft(
      {
        customerId: TEST_CUSTOMER_ID,
        dueDate: '2099-06-06',
        issueDate: '2099-05-06',
        lines: [{ description: 'F', quantity: 1, unitPrice: 100, vatRate: 20 }],
      },
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )

    const result = await service.listInvoices(99, 10, TEST_ACCOUNTING_ACCESS_CONTEXT)

    assert.equal(result.pagination.page, 1)
    assert.equal(result.pagination.totalPages, 1)
    assert.lengthOf(result.items, 6)
    assert.include(
      result.items.map((item) => item.id),
      draftA.id
    )
  })

  test('listInvoices accepts custom perPage and reflects it in pagination', async ({ assert }) => {
    const service = new InvoiceService(db)
    for (let i = 1; i <= 6; i++) {
      await service.createDraft(
        {
          customerId: TEST_CUSTOMER_ID,
          dueDate: `2099-05-0${i}`,
          issueDate: `2099-04-0${i}`,
          lines: [{ description: 'A', quantity: 1, unitPrice: 100, vatRate: 20 }],
        },
        TEST_ACCOUNTING_ACCESS_CONTEXT
      )
    }

    const result = await service.listInvoices(1, 3, TEST_ACCOUNTING_ACCESS_CONTEXT)

    assert.equal(result.pagination.perPage, 3)
    assert.equal(result.pagination.totalPages, 2)
    assert.lengthOf(result.items, 3)
  })

  test('listInvoices filters items by issueDate range', async ({ assert }) => {
    const service = new InvoiceService(db)
    const outsideBefore = await service.createDraft(
      {
        customerId: TEST_CUSTOMER_ID,
        dueDate: '2099-04-30',
        issueDate: '2099-03-31',
        lines: [{ description: 'A', quantity: 1, unitPrice: 100, vatRate: 20 }],
      },
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )
    const insideA = await service.createDraft(
      {
        customerId: TEST_CUSTOMER_ID,
        dueDate: '2099-05-01',
        issueDate: '2099-04-01',
        lines: [{ description: 'A', quantity: 1, unitPrice: 100, vatRate: 20 }],
      },
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )
    const insideB = await service.createDraft(
      {
        customerId: TEST_CUSTOMER_ID,
        dueDate: '2099-05-15',
        issueDate: '2099-04-15',
        lines: [{ description: 'A', quantity: 1, unitPrice: 100, vatRate: 20 }],
      },
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )
    const outsideAfter = await service.createDraft(
      {
        customerId: TEST_CUSTOMER_ID,
        dueDate: '2099-06-01',
        issueDate: '2099-05-01',
        lines: [{ description: 'A', quantity: 1, unitPrice: 100, vatRate: 20 }],
      },
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )

    const result = await service.listInvoices(1, 10, TEST_ACCOUNTING_ACCESS_CONTEXT, {
      endDate: '2099-04-30',
      startDate: '2099-04-01',
    })

    assert.equal(result.pagination.totalItems, 2)
    assert.deepEqual(
      result.items.map((item) => item.id),
      [insideB.id, insideA.id]
    )
    assert.notInclude(
      result.items.map((item) => item.id),
      outsideBefore.id
    )
    assert.notInclude(
      result.items.map((item) => item.id),
      outsideAfter.id
    )
  })

  test('listInvoices filters items by search with coherent pagination', async ({ assert }) => {
    const service = new InvoiceService(db)
    const matching = await service.createDraft(
      {
        customerId: TEST_CUSTOMER_ID,
        dueDate: '2099-05-10',
        issueDate: '2099-04-10',
        lines: [{ description: 'A', quantity: 1, unitPrice: 100, vatRate: 20 }],
      },
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )
    await service.createDraft(
      {
        customerId: SECOND_CUSTOMER_ID,
        dueDate: '2099-05-11',
        issueDate: '2099-04-11',
        lines: [{ description: 'A', quantity: 1, unitPrice: 100, vatRate: 20 }],
      },
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )

    const result = await service.listInvoices(
      1,
      10,
      TEST_ACCOUNTING_ACCESS_CONTEXT,
      undefined,
      undefined,
      'Test Company'
    )

    assert.include(
      result.items.map((item) => item.id),
      matching.id
    )
    assert.isTrue(
      result.items.every((item) => item.customerCompanyName.toLowerCase().includes('test company'))
    )
    assert.equal(result.pagination.totalItems, result.items.length)
  })

  test('listInvoices filters items by customer scope', async ({ assert }) => {
    const service = new InvoiceService(db)
    await service.createDraft(
      {
        customerId: TEST_CUSTOMER_ID,
        dueDate: '2099-05-01',
        issueDate: '2099-04-01',
        lines: [{ description: 'A', quantity: 1, unitPrice: 100, vatRate: 20 }],
      },
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )
    await service.createDraft(
      {
        customerId: TEST_CUSTOMER_ID,
        dueDate: '2099-05-20',
        issueDate: '2099-04-20',
        lines: [{ description: 'A', quantity: 1, unitPrice: 100, vatRate: 20 }],
      },
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )
    await service.createDraft(
      {
        customerId: SECOND_CUSTOMER_ID,
        dueDate: '2099-05-25',
        issueDate: '2099-04-25',
        lines: [{ description: 'A', quantity: 1, unitPrice: 100, vatRate: 20 }],
      },
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )

    const result = await service.listInvoices(
      1,
      10,
      TEST_ACCOUNTING_ACCESS_CONTEXT,
      undefined,
      TEST_CUSTOMER_ID
    )

    assert.isTrue(result.items.every((item) => item.customerId === TEST_CUSTOMER_ID))
  })

  test('listInvoices with customer and date filter returns empty list when no invoice matches the scope', async ({
    assert,
  }) => {
    const service = new InvoiceService(db)
    await service.createDraft(
      {
        customerId: TEST_CUSTOMER_ID,
        dueDate: '2099-04-15',
        issueDate: '2099-03-15',
        lines: [{ description: 'A', quantity: 1, unitPrice: 100, vatRate: 20 }],
      },
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )
    await service.createDraft(
      {
        customerId: SECOND_CUSTOMER_ID,
        dueDate: '2099-05-10',
        issueDate: '2099-04-10',
        lines: [{ description: 'A', quantity: 1, unitPrice: 100, vatRate: 20 }],
      },
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )

    const result = await service.listInvoices(
      1,
      10,
      TEST_ACCOUNTING_ACCESS_CONTEXT,
      { endDate: '2099-04-30', startDate: '2099-04-01' },
      TEST_CUSTOMER_ID
    )

    assert.deepEqual(result.items, [])
  })
})
