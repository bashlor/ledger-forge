import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { DEFAULT_LIST_PER_PAGE } from '#core/accounting/application/support/pagination'
import { auditEvents, expenses, journalEntries } from '#core/accounting/drizzle/schema'
import { EXPENSE_CATEGORIES } from '#core/accounting/expense_categories'
import { member } from '#core/user_management/drizzle/schema'
import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'
import { eq } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'

import {
  seedTestMember,
  seedTestOrganization,
  seedTestUser,
  setupTestDatabaseForGroup,
  TEST_TENANT_ID,
} from '../../../../../tests/helpers/testcontainers_db.js'
import {
  authCookie,
  bindAccountingAuth,
  resetAccountingAuthContext,
  TEST_ACCOUNTING_USER_EMAIL,
  TEST_ACCOUNTING_USER_ID,
  TEST_ACCOUNTING_USER_PUBLIC_ID,
} from './accounting_test_support.js'

let db: PostgresJsDatabase<any>

function inertiaGet(client: any, url: string) {
  return client
    .get(url)
    .header('cookie', authCookie())
    .header('x-inertia', 'true')
    .header('x-inertia-version', '1')
}

test.group('Expenses routes | create → confirm → journal', (group) => {
  let cleanup: () => Promise<void>

  group.setup(async () => {
    const ctx = await setupTestDatabaseForGroup()
    cleanup = ctx.cleanup
    db = await app.container.make('drizzle')
    await seedTestOrganization(db)
    await seedTestUser(db, {
      email: TEST_ACCOUNTING_USER_EMAIL,
      id: TEST_ACCOUNTING_USER_ID,
      name: 'Test User',
      publicId: TEST_ACCOUNTING_USER_PUBLIC_ID,
    })
    await seedTestMember(db, {
      id: 'member_test_expenses_actor',
      organizationId: TEST_TENANT_ID,
      role: 'member',
      userId: TEST_ACCOUNTING_USER_ID,
    })
  })

  group.each.setup(async () => {
    resetAccountingAuthContext()
    bindAccountingAuth()
    await db.delete(auditEvents)
    await db.delete(journalEntries)
    await db.delete(expenses)
    await db
      .update(member)
      .set({ isActive: true })
      .where(eq(member.userId, TEST_ACCOUNTING_USER_ID))
  })

  group.teardown(async () => cleanup())

  test('creates a draft expense via POST /expenses', async ({ client }) => {
    const response = await client
      .post('/expenses')
      .header('cookie', authCookie())
      .redirects(0)
      .form({
        amount: 42.5,
        category: 'Software',
        date: '2026-04-01',
        label: 'IDE license',
      })

    response.assertStatus(302)

    const rows = await db.select().from(expenses)
    const created = rows[0]

    response.assert?.equal(rows.length, 1)
    response.assert?.equal(created.status, 'draft')
    response.assert?.equal(created.amountCents, 4250)
    response.assert?.equal(created.label, 'IDE license')
  })

  test('GET /expenses returns the Inertia page contract with filters and categories', async ({
    assert,
    client,
  }) => {
    const expenseId = uuidv7()
    await db.insert(expenses).values({
      amountCents: 4250,
      category: 'Software',
      createdBy: TEST_ACCOUNTING_USER_ID,
      date: '2026-04-01',
      id: expenseId,
      label: 'IDE license',
      organizationId: TEST_TENANT_ID,
      status: 'draft',
    })

    const response = await inertiaGet(
      client,
      '/expenses?search=IDE&perPage=25&startDate=2026-04-01&endDate=2026-04-30'
    ).redirects(0)

    response.assertStatus(200)
    assert.equal(response.body().component, 'app/expenses')

    const props = response.body().props
    assert.isFalse(props.accountingReadOnly)
    assert.isString(props.accountingReadOnlyMessage)
    assert.deepEqual(props.categories, [...EXPENSE_CATEGORIES])
    assert.equal(props.filters.search, 'IDE')
    assert.equal(props.expenses.pagination.page, 1)
    assert.equal(props.expenses.pagination.perPage, 25)
    assert.equal(props.expenses.pagination.totalItems, 1)
    assert.equal(props.expenses.items.length, 1)
    assert.equal(props.expenses.items[0].id, expenseId)
    assert.equal(props.expenses.items[0].label, 'IDE license')
  })

  test('GET /expenses returns default pagination props with an empty search filter', async ({
    assert,
    client,
  }) => {
    const expenseId = uuidv7()
    await db.insert(expenses).values({
      amountCents: 1000,
      category: 'Office',
      createdBy: TEST_ACCOUNTING_USER_ID,
      date: '2026-04-02',
      id: expenseId,
      label: 'Pens',
      organizationId: TEST_TENANT_ID,
      status: 'draft',
    })

    const response = await inertiaGet(client, '/expenses').redirects(0)

    response.assertStatus(200)
    assert.equal(response.body().component, 'app/expenses')

    const props = response.body().props
    assert.equal(props.filters.search, '')
    assert.equal(props.expenses.pagination.page, 1)
    assert.equal(props.expenses.pagination.perPage, DEFAULT_LIST_PER_PAGE)
    assert.equal(props.expenses.pagination.totalItems, 1)
    assert.equal(props.expenses.pagination.totalPages, 1)
    assert.equal(props.expenses.items[0].id, expenseId)
  })

  test('GET /expenses clamps oversized pagination through the route contract', async ({
    assert,
    client,
  }) => {
    await db.insert(expenses).values([
      {
        amountCents: 1000,
        category: 'Software',
        createdBy: TEST_ACCOUNTING_USER_ID,
        date: '2026-04-01',
        id: uuidv7(),
        label: 'Expense 1',
        organizationId: TEST_TENANT_ID,
        status: 'draft',
      },
      {
        amountCents: 2000,
        category: 'Software',
        createdBy: TEST_ACCOUNTING_USER_ID,
        date: '2026-04-02',
        id: uuidv7(),
        label: 'Expense 2',
        organizationId: TEST_TENANT_ID,
        status: 'draft',
      },
      {
        amountCents: 3000,
        category: 'Software',
        createdBy: TEST_ACCOUNTING_USER_ID,
        date: '2026-04-03',
        id: uuidv7(),
        label: 'Expense 3',
        organizationId: TEST_TENANT_ID,
        status: 'draft',
      },
    ])

    const response = await inertiaGet(
      client,
      '/expenses?page=99&perPage=2&search=Expense'
    ).redirects(0)

    response.assertStatus(200)

    const props = response.body().props
    assert.equal(props.filters.search, 'Expense')
    assert.equal(props.expenses.pagination.perPage, 2)
    assert.equal(props.expenses.pagination.totalPages, 2)
    assert.equal(props.expenses.pagination.page, 2)
    assert.equal(props.expenses.items.length, 1)
  })

  test('confirms a draft and creates a journal entry atomically', async ({ assert, client }) => {
    await client.post('/expenses').header('cookie', authCookie()).redirects(0).form({
      amount: 99.99,
      category: 'Infrastructure',
      date: '2026-04-10',
      label: 'Cloud hosting',
    })

    const [draft] = await db.select().from(expenses)

    const confirmResponse = await client
      .post(`/expenses/${draft.id}/confirm-draft`)
      .header('cookie', authCookie())
      .redirects(0)
      .form({})

    confirmResponse.assertStatus(302)

    const [confirmed] = await db.select().from(expenses).where(eq(expenses.id, draft.id))

    assert.equal(confirmed.status, 'confirmed')

    const entries = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.expenseId, draft.id))

    assert.equal(entries.length, 1)
    assert.equal(entries[0].amountCents, 9999)
    assert.equal(entries[0].label, 'Cloud hosting')
    assert.equal(entries[0].date, '2026-04-10')
  })

  test('cannot delete a confirmed expense', async ({ client }) => {
    await client.post('/expenses').header('cookie', authCookie()).redirects(0).form({
      amount: 10,
      category: 'Office',
      date: '2026-04-01',
      label: 'Pens',
    })

    const [draft] = await db.select().from(expenses)

    await client
      .post(`/expenses/${draft.id}/confirm-draft`)
      .header('cookie', authCookie())
      .redirects(0)
      .form({})

    const deleteResponse = await client
      .delete(`/expenses/${draft.id}`)
      .header('cookie', authCookie())
      .redirects(0)

    deleteResponse.assertStatus(302)

    const rows = await db.select().from(expenses)
    deleteResponse.assert?.equal(rows.length, 1, 'confirmed expense was not deleted')
    deleteResponse.assert?.equal(rows[0].status, 'confirmed')
  })

  test('GET /expenses returns 403 for an inactive membership', async ({ client }) => {
    await db
      .update(member)
      .set({ isActive: false })
      .where(eq(member.userId, TEST_ACCOUNTING_USER_ID))

    const response = await client
      .get('/expenses')
      .header('cookie', authCookie())
      .header('x-inertia', 'true')
      .header('x-inertia-version', '1')
      .redirects(0)

    response.assertStatus(403)
  })

  test('inactive membership cannot create, confirm, or delete expenses', async ({
    assert,
    client,
  }) => {
    await db
      .update(member)
      .set({ isActive: false })
      .where(eq(member.userId, TEST_ACCOUNTING_USER_ID))

    const createResponse = await client
      .post('/expenses')
      .header('cookie', authCookie())
      .redirects(0)
      .form({
        amount: 42.5,
        category: 'Software',
        date: '2026-04-01',
        label: 'Blocked draft',
      })

    createResponse.assertStatus(302)
    assert.lengthOf(await db.select().from(expenses), 0)

    await db
      .update(member)
      .set({ isActive: true })
      .where(eq(member.userId, TEST_ACCOUNTING_USER_ID))

    await client.post('/expenses').header('cookie', authCookie()).redirects(0).form({
      amount: 15,
      category: 'Office',
      date: '2026-04-02',
      label: 'Existing draft',
    })

    const [draft] = await db.select().from(expenses)

    await db
      .update(member)
      .set({ isActive: false })
      .where(eq(member.userId, TEST_ACCOUNTING_USER_ID))

    const confirmResponse = await client
      .post(`/expenses/${draft.id}/confirm-draft`)
      .header('cookie', authCookie())
      .redirects(0)
      .form({})

    confirmResponse.assertStatus(302)

    const deleteResponse = await client
      .delete(`/expenses/${draft.id}`)
      .header('cookie', authCookie())
      .redirects(0)

    deleteResponse.assertStatus(302)

    const [row] = await db.select().from(expenses).where(eq(expenses.id, draft.id))
    assert.equal(row.status, 'draft')
  })

  test('create redirects back to the current expenses query params', async ({ assert, client }) => {
    const response = await client
      .post('/expenses')
      .header('cookie', authCookie())
      .redirects(0)
      .form({
        amount: 42.5,
        category: 'Software',
        date: '2026-04-01',
        endDate: '2026-04-30',
        label: 'Redirect draft',
        page: 3,
        perPage: 25,
        search: 'cloud',
        startDate: '2026-04-01',
      })

    response.assertStatus(302)

    const location = new URL(`http://localhost${response.header('location')}`)
    assert.equal(location.pathname, '/expenses')
    assert.equal(location.searchParams.get('page'), '3')
    assert.equal(location.searchParams.get('perPage'), '25')
    assert.equal(location.searchParams.get('search'), 'cloud')
    assert.equal(location.searchParams.get('startDate'), '2026-04-01')
    assert.equal(location.searchParams.get('endDate'), '2026-04-30')
  })

  test('confirm redirects back to the current expenses query params', async ({
    assert,
    client,
  }) => {
    await client.post('/expenses').header('cookie', authCookie()).redirects(0).form({
      amount: 99.99,
      category: 'Infrastructure',
      date: '2026-04-10',
      label: 'Cloud hosting',
    })

    const [draft] = await db.select().from(expenses)

    const response = await client
      .post(`/expenses/${draft.id}/confirm-draft`)
      .header('cookie', authCookie())
      .redirects(0)
      .form({
        endDate: '2026-04-30',
        page: 2,
        perPage: 50,
        search: 'hosting',
        startDate: '2026-04-01',
      })

    response.assertStatus(302)

    const location = new URL(`http://localhost${response.header('location')}`)
    assert.equal(location.pathname, '/expenses')
    assert.equal(location.searchParams.get('page'), '2')
    assert.equal(location.searchParams.get('perPage'), '50')
    assert.equal(location.searchParams.get('search'), 'hosting')
    assert.equal(location.searchParams.get('startDate'), '2026-04-01')
    assert.equal(location.searchParams.get('endDate'), '2026-04-30')
  })

  test('delete redirects back to the current expenses query params', async ({ assert, client }) => {
    await client.post('/expenses').header('cookie', authCookie()).redirects(0).form({
      amount: 12,
      category: 'Office',
      date: '2026-04-16',
      label: 'Redirect delete',
    })

    const [draft] = await db.select().from(expenses)

    const response = await client
      .delete(`/expenses/${draft.id}`)
      .header('cookie', authCookie())
      .redirects(0)
      .form({
        endDate: '2026-04-30',
        page: 4,
        perPage: 25,
        search: 'delete',
        startDate: '2026-04-01',
      })

    response.assertStatus(302)

    const location = new URL(`http://localhost${response.header('location')}`)
    assert.equal(location.pathname, '/expenses')
    assert.equal(location.searchParams.get('page'), '4')
    assert.equal(location.searchParams.get('perPage'), '25')
    assert.equal(location.searchParams.get('search'), 'delete')
    assert.equal(location.searchParams.get('startDate'), '2026-04-01')
    assert.equal(location.searchParams.get('endDate'), '2026-04-30')
  })

  test('confirming a non-existent expense returns 404', async ({ assert, client }) => {
    const missingId = uuidv7()
    const response = await client
      .post(`/expenses/${missingId}/confirm-draft`)
      .header('accept', 'application/json')
      .header('cookie', authCookie())
      .redirects(0)
      .form({})

    response.assertStatus(404)

    const rows = await db.select().from(expenses)
    assert.equal(rows.length, 0)
  })

  test('deleting a non-existent expense returns 404', async ({ assert, client }) => {
    const missingId = uuidv7()
    const response = await client
      .delete(`/expenses/${missingId}`)
      .header('accept', 'application/json')
      .header('cookie', authCookie())
      .redirects(0)

    response.assertStatus(404)

    const rows = await db.select().from(expenses)
    assert.equal(rows.length, 0)
  })

  test('cannot confirm an already-confirmed expense through the route twice', async ({
    assert,
    client,
  }) => {
    await client.post('/expenses').header('cookie', authCookie()).redirects(0).form({
      amount: 40,
      category: 'Office',
      date: '2026-04-01',
      label: 'Re-confirm test',
    })

    const [draft] = await db.select().from(expenses)
    await client
      .post(`/expenses/${draft.id}/confirm-draft`)
      .header('cookie', authCookie())
      .redirects(0)
      .form({})

    const response = await client
      .post(`/expenses/${draft.id}/confirm-draft`)
      .header('cookie', authCookie())
      .redirects(0)
      .form({})

    response.assertStatus(302)

    const entries = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.expenseId, draft.id))
    assert.equal(entries.length, 1, 'a second confirm must not create a second journal entry')
  })
})

// =============================================================================
// Authorization
// =============================================================================

test.group('Expenses routes | authorization', (group) => {
  let cleanup: () => Promise<void>

  group.setup(async () => {
    const ctx = await setupTestDatabaseForGroup()
    cleanup = ctx.cleanup
    resetAccountingAuthContext()
    bindAccountingAuth()
  })

  group.teardown(async () => cleanup())

  test('redirects unauthenticated requests for expense routes to /signin', async ({ client }) => {
    const fakeId = '019d9aaf-0000-7000-0000-000000000001'

    const getResponse = await client.get('/expenses').redirects(0)
    getResponse.assertStatus(302)
    getResponse.assertHeader('location', '/signin')

    const postResponse = await client
      .post('/expenses')
      .redirects(0)
      .form({ amount: 10, category: 'Software', date: '2026-04-01', label: 'Test' })
    postResponse.assertStatus(302)
    postResponse.assertHeader('location', '/signin')

    const confirmResponse = await client
      .post(`/expenses/${fakeId}/confirm-draft`)
      .redirects(0)
      .form({})
    confirmResponse.assertStatus(302)
    confirmResponse.assertHeader('location', '/signin')

    const deleteResponse = await client.delete(`/expenses/${fakeId}`).redirects(0)
    deleteResponse.assertStatus(302)
    deleteResponse.assertHeader('location', '/signin')
  })
})

// =============================================================================
// Validation
// =============================================================================

test.group('Expenses routes | validation', (group) => {
  let cleanup: () => Promise<void>
  let validationDb: PostgresJsDatabase<any>

  group.setup(async () => {
    const ctx = await setupTestDatabaseForGroup()
    cleanup = ctx.cleanup
    validationDb = await app.container.make('drizzle')
  })

  group.each.setup(async () => {
    resetAccountingAuthContext()
    bindAccountingAuth()
    await validationDb.delete(auditEvents)
    await validationDb.delete(journalEntries)
    await validationDb.delete(expenses)
  })

  group.teardown(async () => cleanup())

  const validBase = {
    amount: 10,
    category: 'Software',
    date: '2026-04-01',
    label: 'Valid expense',
  }

  test('rejects amount of zero', async ({ assert, client }) => {
    await client
      .post('/expenses')
      .header('cookie', authCookie())
      .redirects(0)
      .form({ ...validBase, amount: 0 })
    const rows = await validationDb.select().from(expenses)
    assert.equal(rows.length, 0, 'no row should be inserted for amount=0')
  })

  test('rejects negative amount', async ({ assert, client }) => {
    await client
      .post('/expenses')
      .header('cookie', authCookie())
      .redirects(0)
      .form({ ...validBase, amount: -5 })
    const rows = await validationDb.select().from(expenses)
    assert.equal(rows.length, 0, 'no row should be inserted for negative amount')
  })

  test('rejects unknown category', async ({ assert, client }) => {
    await client
      .post('/expenses')
      .header('cookie', authCookie())
      .redirects(0)
      .form({ ...validBase, category: 'NotACategory' })
    const rows = await validationDb.select().from(expenses)
    assert.equal(rows.length, 0, 'no row should be inserted for invalid category')
  })

  test('rejects empty label', async ({ assert, client }) => {
    await client
      .post('/expenses')
      .header('cookie', authCookie())
      .redirects(0)
      .form({ ...validBase, label: '' })
    const rows = await validationDb.select().from(expenses)
    assert.equal(rows.length, 0, 'no row should be inserted for empty label')
  })

  test('rejects a badly formatted date', async ({ assert, client }) => {
    await client
      .post('/expenses')
      .header('cookie', authCookie())
      .redirects(0)
      .form({ ...validBase, date: 'not-a-date' })
    const rows = await validationDb.select().from(expenses)
    assert.equal(rows.length, 0, 'no row should be inserted for malformed date')
  })

  test('rejects an invalid calendar date (2026-02-30)', async ({ assert, client }) => {
    await client
      .post('/expenses')
      .header('cookie', authCookie())
      .redirects(0)
      .form({ ...validBase, date: '2026-02-30' })
    const rows = await validationDb.select().from(expenses)
    assert.equal(rows.length, 0, 'no row should be inserted for non-existent calendar date')
  })
})

// =============================================================================
// Validation: date range coupling
// =============================================================================

test.group('Expenses routes | date range validation', (group) => {
  let cleanup: () => Promise<void>

  group.setup(async () => {
    const ctx = await setupTestDatabaseForGroup()
    cleanup = ctx.cleanup
    db = await app.container.make('drizzle')
    await seedTestOrganization(db)
    await seedTestUser(db, {
      email: TEST_ACCOUNTING_USER_EMAIL,
      id: TEST_ACCOUNTING_USER_ID,
      name: 'Test User',
      publicId: TEST_ACCOUNTING_USER_PUBLIC_ID,
    })
    await seedTestMember(db, {
      id: 'member_test_expenses_date_range_actor',
      organizationId: TEST_TENANT_ID,
      role: 'member',
      userId: TEST_ACCOUNTING_USER_ID,
    })
    resetAccountingAuthContext()
    bindAccountingAuth()
  })

  group.teardown(async () => cleanup())

  test('GET /expenses with both dates succeeds', async ({ client }) => {
    const response = await client
      .get('/expenses')
      .header('cookie', authCookie())
      .qs({ endDate: '2026-04-30', startDate: '2026-04-01' })
      .redirects(0)
    response.assertStatus(200)
  })

  test('GET /expenses with no dates succeeds', async ({ client }) => {
    const response = await client.get('/expenses').header('cookie', authCookie()).redirects(0)
    response.assertStatus(200)
  })

  test('GET /expenses with only startDate redirects back with error', async ({ client }) => {
    const response = await client
      .get('/expenses')
      .header('cookie', authCookie())
      .qs({ startDate: '2026-04-01' })
      .redirects(0)
    response.assertStatus(302)
  })

  test('GET /expenses with only endDate redirects back with error', async ({ client }) => {
    const response = await client
      .get('/expenses')
      .header('cookie', authCookie())
      .qs({ endDate: '2026-04-30' })
      .redirects(0)
    response.assertStatus(302)
  })

  test('GET /expenses rejects inverted date ranges', async ({ client }) => {
    const response = await client
      .get('/expenses')
      .header('cookie', authCookie())
      .qs({ endDate: '2026-04-01', startDate: '2026-04-30' })
      .redirects(0)
    response.assertStatus(302)
  })
})
