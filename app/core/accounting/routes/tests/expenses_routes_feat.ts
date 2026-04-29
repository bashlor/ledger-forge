import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

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
  setAccountingAuthContext,
  TEST_ACCOUNTING_USER_EMAIL,
  TEST_ACCOUNTING_USER_ID,
  TEST_ACCOUNTING_USER_PUBLIC_ID,
} from './accounting_test_support.js'

let db: PostgresJsDatabase<any>

function assertExpensesRedirectQuery(
  assert: any,
  locationHeader: null | string | undefined,
  expected: Record<string, string>
) {
  const location = new URL(`http://localhost${locationHeader ?? ''}`)
  assert.equal(location.pathname, '/expenses')
  for (const [key, value] of Object.entries(expected)) {
    assert.equal(location.searchParams.get(key), value)
  }
}

function inertiaGet(client: any, url: string) {
  return client
    .get(url)
    .header('cookie', authCookie())
    .header('x-inertia', 'true')
    .header('x-inertia-version', '1')
}

test.group('Expenses routes | boundary contract', (group) => {
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

  test('contract:POST /expenses happy path returns redirect', async ({ assert, client }) => {
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

    assert.equal(rows.length, 1)
    assert.exists(created.id)
  })

  test('contract:GET /expenses returns minimal Inertia page contract', async ({
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
    assert.deepEqual(props.categories, [...EXPENSE_CATEGORIES])
    assert.equal(props.filters.search, 'IDE')
    assert.equal(props.expenses.items.length, 1)
    assert.equal(props.expenses.items[0].id, expenseId)
  })

  test('contract:POST /expenses/:id/confirm-draft happy path returns redirect', async ({
    client,
  }) => {
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
  })

  test('contract:PUT /expenses/:id happy path updates draft and returns redirect', async ({
    assert,
    client,
  }) => {
    await client.post('/expenses').header('cookie', authCookie()).redirects(0).form({
      amount: 12,
      category: 'Office',
      date: '2026-04-16',
      label: 'Draft to update',
    })

    const [draft] = await db.select().from(expenses)

    const updateResponse = await client
      .put(`/expenses/${draft.id}`)
      .header('cookie', authCookie())
      .redirects(0)
      .form({
        amount: 34.56,
        category: 'Travel',
        date: '2026-04-20',
        label: 'Updated draft',
      })

    updateResponse.assertStatus(302)

    const [updated] = await db.select().from(expenses).where(eq(expenses.id, draft.id))
    assert.equal(updated.amountCents, 3456)
    assert.equal(updated.category, 'Travel')
    assert.equal(updated.date, '2026-04-20')
    assert.equal(updated.label, 'Updated draft')
    assert.equal(updated.status, 'draft')
  })

  test('contract:DELETE /expenses/:id happy path returns redirect', async ({ client }) => {
    await client.post('/expenses').header('cookie', authCookie()).redirects(0).form({
      amount: 12,
      category: 'Office',
      date: '2026-04-16',
      label: 'Delete draft',
    })
    const [draft] = await db.select().from(expenses)
    const deleteResponse = await client
      .delete(`/expenses/${draft.id}`)
      .header('cookie', authCookie())
      .redirects(0)
    deleteResponse.assertStatus(302)
  })

  test('contract:GET /expenses returns 403 for inactive membership', async ({ client }) => {
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

  test('contract:GET /expenses returns 403 for active tenant without membership', async ({
    client,
  }) => {
    setAccountingAuthContext({ organizationId: 'tenant_without_membership' })
    bindAccountingAuth()

    const response = await client
      .get('/expenses')
      .header('cookie', authCookie())
      .header('x-inertia', 'true')
      .header('x-inertia-version', '1')
      .redirects(0)

    response.assertStatus(403)
  })

  test('contract:mutation redirects keep expense query-string per endpoint', async ({
    assert,
    client,
  }) => {
    const createResponse = await client
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
    createResponse.assertStatus(302)
    assertExpensesRedirectQuery(assert, createResponse.header('location'), {
      endDate: '2026-04-30',
      page: '3',
      perPage: '25',
      search: 'cloud',
      startDate: '2026-04-01',
    })

    await client.post('/expenses').header('cookie', authCookie()).redirects(0).form({
      amount: 99.99,
      category: 'Infrastructure',
      date: '2026-04-10',
      label: 'Cloud hosting',
    })

    const [draft] = await db.select().from(expenses)

    const updateResponse = await client
      .put(`/expenses/${draft.id}`)
      .header('cookie', authCookie())
      .redirects(0)
      .form({
        amount: 100,
        category: 'Software',
        date: '2026-04-12',
        endDate: '2026-04-30',
        label: 'Updated redirect',
        page: 5,
        perPage: 25,
        search: 'updated',
        startDate: '2026-04-01',
      })

    updateResponse.assertStatus(302)
    assertExpensesRedirectQuery(assert, updateResponse.header('location'), {
      endDate: '2026-04-30',
      page: '5',
      perPage: '25',
      search: 'updated',
      startDate: '2026-04-01',
    })

    const confirmResponse = await client
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

    confirmResponse.assertStatus(302)
    assertExpensesRedirectQuery(assert, confirmResponse.header('location'), {
      endDate: '2026-04-30',
      page: '2',
      perPage: '50',
      search: 'hosting',
      startDate: '2026-04-01',
    })

    const deleteResponse = await client
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

    deleteResponse.assertStatus(302)
    assertExpensesRedirectQuery(assert, deleteResponse.header('location'), {
      endDate: '2026-04-30',
      page: '4',
      perPage: '25',
      search: 'delete',
      startDate: '2026-04-01',
    })
  })

  test('contract:POST /expenses/:id/confirm-draft returns 404 when expense does not exist', async ({
    client,
  }) => {
    const missingId = uuidv7()
    const response = await client
      .post(`/expenses/${missingId}/confirm-draft`)
      .header('accept', 'application/json')
      .header('cookie', authCookie())
      .redirects(0)
      .form({})

    response.assertStatus(404)
  })

  test('contract:PUT /expenses/:id returns 404 when expense does not exist', async ({ client }) => {
    const missingId = uuidv7()
    const response = await client
      .put(`/expenses/${missingId}`)
      .header('accept', 'application/json')
      .header('cookie', authCookie())
      .redirects(0)
      .form({
        amount: 42.5,
        category: 'Software',
        date: '2026-04-01',
        label: 'Missing draft',
      })

    response.assertStatus(404)
  })

  test('contract:PUT /expenses/:id rejects confirmed expense updates without changing row', async ({
    assert,
    client,
  }) => {
    await client.post('/expenses').header('cookie', authCookie()).redirects(0).form({
      amount: 99.99,
      category: 'Infrastructure',
      date: '2026-04-10',
      label: 'Confirmed hosting',
    })

    const [draft] = await db.select().from(expenses)
    await client
      .post(`/expenses/${draft.id}/confirm-draft`)
      .header('cookie', authCookie())
      .redirects(0)
      .form({})

    const response = await client
      .put(`/expenses/${draft.id}`)
      .header('accept', 'application/json')
      .header('cookie', authCookie())
      .redirects(0)
      .form({
        amount: 12,
        category: 'Office',
        date: '2026-04-12',
        label: 'Should not update',
      })

    response.assertStatus(302)

    const [unchanged] = await db.select().from(expenses).where(eq(expenses.id, draft.id))
    assert.equal(unchanged.status, 'confirmed')
    assert.equal(unchanged.amountCents, 9999)
    assert.equal(unchanged.label, 'Confirmed hosting')
  })

  test('contract:DELETE /expenses/:id returns 404 when expense does not exist', async ({
    client,
  }) => {
    const missingId = uuidv7()
    const response = await client
      .delete(`/expenses/${missingId}`)
      .header('accept', 'application/json')
      .header('cookie', authCookie())
      .redirects(0)

    response.assertStatus(404)
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

    const putResponse = await client
      .put(`/expenses/${fakeId}`)
      .redirects(0)
      .form({ amount: 10, category: 'Software', date: '2026-04-01', label: 'Test' })
    putResponse.assertStatus(302)
    putResponse.assertHeader('location', '/signin')

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
