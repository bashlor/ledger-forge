import ace from '@adonisjs/core/services/ace'
import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'
import { count, eq } from 'drizzle-orm'

import {
  DEMO_CUSTOMER_COUNT,
  DEMO_EXPENSE_COUNT,
  DEMO_INVOICE_COUNT,
} from '../../app/core/accounting/application/demo/demo_dataset_service.js'
import * as schema from '../../app/core/common/drizzle/index.js'
import ResetDemo from '../../commands/reset_demo.js'
import SeedDemo from '../../commands/seed_demo.js'
import { setupTestDatabaseForGroup, TEST_TENANT_ID } from '../helpers/testcontainers_db.js'

test.group('Demo Commands', (group) => {
  let cleanup: () => Promise<void>

  group.setup(async () => {
    const result = await setupTestDatabaseForGroup()
    cleanup = result.cleanup
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.setup(async () => {
    ace.ui.switchMode('raw')

    const db = await app.container.make('drizzle')
    await db.delete(schema.auditEvents)
    await db.delete(schema.journalEntries)
    await db.delete(schema.invoices)
    await db.delete(schema.expenses)
    await db.delete(schema.customers)
    await db.delete(schema.member)
    await db.delete(schema.organization)
    await db.insert(schema.organization).values({
      id: TEST_TENANT_ID,
      name: 'Test Organization',
      slug: 'test-org',
    })

    return () => ace.ui.switchMode('normal')
  })

  test('demo:seed populates the requested tenant when empty', async ({ assert }) => {
    const db = await app.container.make('drizzle')
    const command = await ace.create(SeedDemo, ['--tenant', TEST_TENANT_ID])

    await command.exec()

    command.assertSucceeded()
    command.assertLogMatches(new RegExp(TEST_TENANT_ID))

    const [customerCount] = await db
      .select({ value: count() })
      .from(schema.customers)
      .where(eq(schema.customers.organizationId, TEST_TENANT_ID))
    const [invoiceCount] = await db
      .select({ value: count() })
      .from(schema.invoices)
      .where(eq(schema.invoices.organizationId, TEST_TENANT_ID))
    const [expenseCount] = await db
      .select({ value: count() })
      .from(schema.expenses)
      .where(eq(schema.expenses.organizationId, TEST_TENANT_ID))

    assert.equal(Number(customerCount?.value ?? 0), DEMO_CUSTOMER_COUNT)
    assert.equal(Number(invoiceCount?.value ?? 0), DEMO_INVOICE_COUNT)
    assert.equal(Number(expenseCount?.value ?? 0), DEMO_EXPENSE_COUNT)
  })

  test('demo:seed fails on non-empty tenants without --force', async () => {
    const command = await ace.create(SeedDemo, ['--tenant', TEST_TENANT_ID])
    await command.exec()
    command.assertSucceeded()

    const again = await ace.create(SeedDemo, ['--tenant', TEST_TENANT_ID])
    await again.exec()

    again.assertFailed()
    again.assertLogMatches(/already contains data/)
  })

  test('demo:reset clears and re-seeds tenant business data', async ({ assert }) => {
    const db = await app.container.make('drizzle')
    const seed = await ace.create(SeedDemo, ['--tenant', TEST_TENANT_ID])
    await seed.exec()
    seed.assertSucceeded()

    await db.insert(schema.customers).values({
      address: '1 reset street',
      company: 'Transient Customer',
      createdBy: null,
      email: 'transient@example.local',
      id: 'transient-customer',
      name: 'Transient',
      organizationId: TEST_TENANT_ID,
      phone: '+33 6 00 00 00 00',
    })

    const reset = await ace.create(ResetDemo, ['--tenant', TEST_TENANT_ID])
    await reset.exec()

    reset.assertSucceeded()

    const customers = await db.query.customers.findMany({
      where: (table, { eq: equal }) => equal(table.organizationId, TEST_TENANT_ID),
    })

    assert.lengthOf(customers, DEMO_CUSTOMER_COUNT)
    assert.isFalse(customers.some((customer) => customer.id === 'transient-customer'))
  })
})
