import type { AccountingBusinessCalendar } from '#core/accounting/application/support/business_calendar'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { InvoiceService } from '#core/accounting/application/invoices/index'
import { SYSTEM_ACCOUNTING_ACCESS_CONTEXT } from '#core/accounting/application/support/access_context'
import { customers, invoiceLines, invoices, journalEntries } from '#core/accounting/drizzle/schema'
import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'

import { setupTestDatabaseForGroup } from '../../../../../tests/helpers/testcontainers_db.js'

const TEST_CUSTOMER_ID = 'invoice-service-test-customer'
const SECOND_CUSTOMER_ID = 'invoice-service-test-customer-2'

test.group('Invoice service integration', (group) => {
  let cleanup: () => Promise<void>
  let db: PostgresJsDatabase<any>

  group.setup(async () => {
    const ctx = await setupTestDatabaseForGroup()
    cleanup = ctx.cleanup
    db = await app.container.make('drizzle')
  })

  group.each.setup(async () => {
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
        phone: '+33 6 12 34 56 78',
      },
      {
        address: '42 avenue des Clients, 69000 Lyon',
        company: 'Invoice Test Company 2',
        email: 'second@testco.fr',
        id: SECOND_CUSTOMER_ID,
        name: 'Bob Martin',
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
      SYSTEM_ACCOUNTING_ACCESS_CONTEXT
    )

    const scoped = await service.getInvoiceForListScope(
      invoice.id,
      {
        customerId: TEST_CUSTOMER_ID,
        dateFilter: undefined,
      },
      SYSTEM_ACCOUNTING_ACCESS_CONTEXT
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
      SYSTEM_ACCOUNTING_ACCESS_CONTEXT
    )

    const scoped = await service.getInvoiceForListScope(
      invoice.id,
      {
        customerId: null,
        dateFilter: { endDate: '2099-04-30', startDate: '2099-04-15' },
      },
      SYSTEM_ACCOUNTING_ACCESS_CONTEXT
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
          SYSTEM_ACCOUNTING_ACCESS_CONTEXT
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
      SYSTEM_ACCOUNTING_ACCESS_CONTEXT
    )

    assert.equal(accepted.dueDate, '2099-04-10')
  })
})
