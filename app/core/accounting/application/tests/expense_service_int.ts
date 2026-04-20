import type { AccountingAccessContext } from '#core/accounting/application/support/access_context'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { ExpenseService } from '#core/accounting/application/expenses/index'
import { auditEvents, expenses, journalEntries } from '#core/accounting/drizzle/schema'
import { DomainError } from '#core/common/errors/domain_error'
import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'
import { eq } from 'drizzle-orm'

import {
  seedTestOrganization,
  setupTestDatabaseForGroup,
  TEST_TENANT_ID,
} from '../../../../../tests/helpers/testcontainers_db.js'

let service: ExpenseService
let db: PostgresJsDatabase<any>

const TEST_ACCOUNTING_ACCESS_CONTEXT: AccountingAccessContext = {
  actorId: 'test_actor',
  isAnonymous: false,
  requestId: 'test',
  tenantId: TEST_TENANT_ID,
}

function makeInput(overrides: Partial<Parameters<ExpenseService['createExpense']>[0]> = {}) {
  return {
    amount: 12.34,
    category: 'Software',
    date: '2026-04-01',
    label: 'Test expense',
    ...overrides,
  }
}

async function truncateExpenses() {
  await db.delete(auditEvents)
  await db.delete(journalEntries)
  await db.delete(expenses)
}

test.group('ExpenseService | createExpense', (group) => {
  let cleanup: () => Promise<void>

  group.setup(async () => {
    const ctx = await setupTestDatabaseForGroup()
    cleanup = ctx.cleanup
    db = await app.container.make('drizzle')
    await seedTestOrganization(db)
    service = new ExpenseService(db)
  })

  group.each.setup(async () => truncateExpenses())
  group.teardown(async () => cleanup())

  test('creates a draft expense and converts decimal to cents', async ({ assert }) => {
    const result = await service.createExpense(
      makeInput({ amount: 18.5 }),
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )

    assert.equal(result.status, 'draft')
    assert.equal(result.amount, 18.5)
    assert.equal(result.canConfirm, true)
    assert.equal(result.canDelete, true)
    assert.equal(result.label, 'Test expense')
    assert.equal(result.category, 'Software')
    assert.equal(result.date, '2026-04-01')
    assert.isString(result.id)
  })

  test('rounds fractional cents correctly', async ({ assert }) => {
    const result = await service.createExpense(
      makeInput({ amount: 12.345 }),
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )

    assert.equal(result.amount, 12.35)
  })

  test('handles whole amounts', async ({ assert }) => {
    const result = await service.createExpense(
      makeInput({ amount: 100 }),
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )

    assert.equal(result.amount, 100)
  })
})

test.group('ExpenseService | confirmExpense', (group) => {
  let cleanup: () => Promise<void>

  group.setup(async () => {
    const ctx = await setupTestDatabaseForGroup()
    cleanup = ctx.cleanup
    db = await app.container.make('drizzle')
    await seedTestOrganization(db)
    service = new ExpenseService(db)
  })

  group.each.setup(async () => truncateExpenses())
  group.teardown(async () => cleanup())

  test('confirms a draft expense', async ({ assert }) => {
    const created = await service.createExpense(makeInput(), TEST_ACCOUNTING_ACCESS_CONTEXT)
    const confirmed = await service.confirmExpense(created.id, TEST_ACCOUNTING_ACCESS_CONTEXT)

    assert.equal(confirmed.status, 'confirmed')
    assert.equal(confirmed.canConfirm, false)
    assert.equal(confirmed.canDelete, false)
    assert.equal(confirmed.amount, 12.34)
  })

  test('throws not_found when expense does not exist', async ({ assert }) => {
    const error = await service
      .confirmExpense('nonexistent-id', TEST_ACCOUNTING_ACCESS_CONTEXT)
      .catch((e) => e)

    assert.instanceOf(error, DomainError)
    assert.equal(error.type, 'not_found')
  })

  test('throws business_logic_error when expense is already confirmed', async ({ assert }) => {
    const created = await service.createExpense(makeInput(), TEST_ACCOUNTING_ACCESS_CONTEXT)
    await service.confirmExpense(created.id, TEST_ACCOUNTING_ACCESS_CONTEXT)

    const error = await service
      .confirmExpense(created.id, TEST_ACCOUNTING_ACCESS_CONTEXT)
      .catch((e) => e)

    assert.instanceOf(error, DomainError)
    assert.equal(error.type, 'business_logic_error')
  })
})

test.group('ExpenseService | confirmExpense + journal atomicity', (group) => {
  let cleanup: () => Promise<void>

  group.setup(async () => {
    const ctx = await setupTestDatabaseForGroup()
    cleanup = ctx.cleanup
    db = await app.container.make('drizzle')
    await seedTestOrganization(db)
    service = new ExpenseService(db)
  })

  group.each.setup(async () => truncateExpenses())
  group.teardown(async () => cleanup())

  test('confirms an expense and creates a journal entry atomically', async ({ assert }) => {
    const created = await service.createExpense(
      makeInput({ amount: 42, label: 'Atomic test' }),
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )
    await service.confirmExpense(created.id, TEST_ACCOUNTING_ACCESS_CONTEXT)

    const entries = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.expenseId, created.id))

    assert.equal(entries.length, 1)
    assert.equal(entries[0].amountCents, 4200)
    assert.equal(entries[0].label, 'Atomic test')
    assert.equal(entries[0].date, '2026-04-01')
    assert.equal(entries[0].type, 'expense')
    assert.equal(entries[0].expenseId, created.id)
  })

  test('does not create a journal entry if the expense is already confirmed', async ({
    assert,
  }) => {
    const created = await service.createExpense(makeInput(), TEST_ACCOUNTING_ACCESS_CONTEXT)
    await service.confirmExpense(created.id, TEST_ACCOUNTING_ACCESS_CONTEXT)

    const error = await service
      .confirmExpense(created.id, TEST_ACCOUNTING_ACCESS_CONTEXT)
      .catch((e) => e)

    assert.instanceOf(error, DomainError)
    assert.equal(error.type, 'business_logic_error')

    const entries = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.expenseId, created.id))

    assert.equal(entries.length, 1, 'only the first confirmation created an entry')
  })
})

test.group('ExpenseService | deleteExpense', (group) => {
  let cleanup: () => Promise<void>

  group.setup(async () => {
    const ctx = await setupTestDatabaseForGroup()
    cleanup = ctx.cleanup
    db = await app.container.make('drizzle')
    await seedTestOrganization(db)
    service = new ExpenseService(db)
  })

  group.each.setup(async () => truncateExpenses())
  group.teardown(async () => cleanup())

  test('deletes a draft expense', async ({ assert }) => {
    const created = await service.createExpense(makeInput(), TEST_ACCOUNTING_ACCESS_CONTEXT)
    await service.deleteExpense(created.id, TEST_ACCOUNTING_ACCESS_CONTEXT)

    const list = await service.listExpenses(1, 5, TEST_ACCOUNTING_ACCESS_CONTEXT)
    const found = list.items.find((e) => e.id === created.id)
    assert.isUndefined(found)
  })

  test('throws not_found when expense does not exist', async ({ assert }) => {
    const error = await service
      .deleteExpense('nonexistent-id', TEST_ACCOUNTING_ACCESS_CONTEXT)
      .catch((e) => e)

    assert.instanceOf(error, DomainError)
    assert.equal(error.type, 'not_found')
  })

  test('throws business_logic_error when expense is confirmed', async ({ assert }) => {
    const created = await service.createExpense(makeInput(), TEST_ACCOUNTING_ACCESS_CONTEXT)
    await service.confirmExpense(created.id, TEST_ACCOUNTING_ACCESS_CONTEXT)

    const error = await service
      .deleteExpense(created.id, TEST_ACCOUNTING_ACCESS_CONTEXT)
      .catch((e) => e)

    assert.instanceOf(error, DomainError)
    assert.equal(error.type, 'business_logic_error')
  })
})

test.group('ExpenseService | listExpenses', (group) => {
  let cleanup: () => Promise<void>

  group.setup(async () => {
    const ctx = await setupTestDatabaseForGroup()
    cleanup = ctx.cleanup
    db = await app.container.make('drizzle')
    await seedTestOrganization(db)
    service = new ExpenseService(db)
  })

  group.each.setup(async () => truncateExpenses())
  group.teardown(async () => cleanup())

  test('returns empty list when no expenses', async ({ assert }) => {
    const result = await service.listExpenses(1, 5, TEST_ACCOUNTING_ACCESS_CONTEXT)

    assert.deepEqual(result.items, [])
    assert.equal(result.pagination.totalItems, 0)
    assert.equal(result.pagination.totalPages, 1)
    assert.equal(result.pagination.page, 1)
  })

  test('sorts by date descending then label ascending', async ({ assert }) => {
    await service.createExpense(
      makeInput({ date: '2026-03-01', label: 'B expense' }),
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )
    await service.createExpense(
      makeInput({ date: '2026-04-01', label: 'Z expense' }),
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )
    await service.createExpense(
      makeInput({ date: '2026-04-01', label: 'A expense' }),
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )
    await service.createExpense(
      makeInput({ date: '2026-02-01', label: 'C expense' }),
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )

    const result = await service.listExpenses(1, 5, TEST_ACCOUNTING_ACCESS_CONTEXT)

    assert.deepEqual(
      result.items.map((e) => e.label),
      ['A expense', 'Z expense', 'B expense', 'C expense']
    )
  })

  test('paginates correctly', async ({ assert }) => {
    for (let i = 0; i < 7; i++) {
      await service.createExpense(
        makeInput({ label: `Expense ${i}` }),
        TEST_ACCOUNTING_ACCESS_CONTEXT
      )
    }

    const page1 = await service.listExpenses(1, 3, TEST_ACCOUNTING_ACCESS_CONTEXT)
    assert.equal(page1.items.length, 3)
    assert.equal(page1.pagination.page, 1)
    assert.equal(page1.pagination.perPage, 3)
    assert.equal(page1.pagination.totalItems, 7)
    assert.equal(page1.pagination.totalPages, 3)

    const page2 = await service.listExpenses(2, 3, TEST_ACCOUNTING_ACCESS_CONTEXT)
    assert.equal(page2.items.length, 3)
    assert.equal(page2.pagination.page, 2)

    const page3 = await service.listExpenses(3, 3, TEST_ACCOUNTING_ACCESS_CONTEXT)
    assert.equal(page3.items.length, 1)
    assert.equal(page3.pagination.page, 3)
  })

  test('summary counts only confirmed expenses for totalAmount', async ({ assert }) => {
    await service.createExpense(
      makeInput({ amount: 50, label: 'Draft one' }),
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )
    const toConfirm1 = await service.createExpense(
      makeInput({ amount: 30, label: 'Confirmed one' }),
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )
    const toConfirm2 = await service.createExpense(
      makeInput({ amount: 20.5, label: 'Confirmed two' }),
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )

    await service.confirmExpense(toConfirm1.id, TEST_ACCOUNTING_ACCESS_CONTEXT)
    await service.confirmExpense(toConfirm2.id, TEST_ACCOUNTING_ACCESS_CONTEXT)

    const summary = await service.getSummary(TEST_ACCOUNTING_ACCESS_CONTEXT)

    assert.equal(summary.totalCount, 3)
    assert.equal(summary.confirmedCount, 2)
    assert.equal(summary.draftCount, 1)
    assert.equal(summary.totalAmount, 50.5)
  })

  test('clamps page to valid range', async ({ assert }) => {
    await service.createExpense(makeInput(), TEST_ACCOUNTING_ACCESS_CONTEXT)

    const tooHigh = await service.listExpenses(999, 5, TEST_ACCOUNTING_ACCESS_CONTEXT)
    assert.equal(tooHigh.pagination.page, 1)

    const tooLow = await service.listExpenses(-1, 5, TEST_ACCOUNTING_ACCESS_CONTEXT)
    assert.equal(tooLow.pagination.page, 1)
  })

  test('filters by date range', async ({ assert }) => {
    await service.createExpense(
      makeInput({ date: '2026-01-15', label: 'Jan' }),
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )
    await service.createExpense(
      makeInput({ date: '2026-02-10', label: 'Feb' }),
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )
    await service.createExpense(
      makeInput({ date: '2026-03-20', label: 'Mar' }),
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )

    const result = await service.listExpenses(1, 10, TEST_ACCOUNTING_ACCESS_CONTEXT, {
      endDate: '2026-02-28',
      startDate: '2026-02-01',
    })

    assert.equal(result.items.length, 1)
    assert.equal(result.items[0].label, 'Feb')
    assert.equal(result.pagination.totalItems, 1)
  })

  test('getSummary respects date filter', async ({ assert }) => {
    const jan = await service.createExpense(
      makeInput({ amount: 10, date: '2026-01-15' }),
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )
    await service.createExpense(
      makeInput({ amount: 20, date: '2026-02-10' }),
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )
    await service.confirmExpense(jan.id, TEST_ACCOUNTING_ACCESS_CONTEXT)

    const all = await service.getSummary(TEST_ACCOUNTING_ACCESS_CONTEXT)
    assert.equal(all.totalCount, 2)
    assert.equal(all.totalAmount, 10)

    const janOnly = await service.getSummary(TEST_ACCOUNTING_ACCESS_CONTEXT, {
      endDate: '2026-01-31',
      startDate: '2026-01-01',
    })
    assert.equal(janOnly.totalCount, 1)
    assert.equal(janOnly.confirmedCount, 1)
    assert.equal(janOnly.totalAmount, 10)

    const febOnly = await service.getSummary(TEST_ACCOUNTING_ACCESS_CONTEXT, {
      endDate: '2026-02-28',
      startDate: '2026-02-01',
    })
    assert.equal(febOnly.totalCount, 1)
    assert.equal(febOnly.draftCount, 1)
    assert.equal(febOnly.totalAmount, 0)
  })
})
