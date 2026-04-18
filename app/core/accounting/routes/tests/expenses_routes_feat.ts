import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { expenses, journalEntries } from '#core/accounting/drizzle/schema'
import { ExpenseService } from '#core/accounting/services/expense_service'
import { AUTH_SESSION_TOKEN_COOKIE_NAME } from '#core/user_management/auth_session_cookie'
import {
  AuthenticationPort,
  type AuthProviderUser,
  type AuthResult,
} from '#core/user_management/domain/authentication'
import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'
import { desc, eq } from 'drizzle-orm'

import { runSimultaneously } from '../../../../../tests/helpers/concurrency_barrier.js'
import { expectRejects } from '../../../../../tests/helpers/expect_rejects.js'
import { setupTestDatabaseForGroup } from '../../../../../tests/helpers/testcontainers_db.js'

const fakeUser: AuthProviderUser = {
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  email: 'test@example.com',
  emailVerified: true,
  id: 'user_test',
  image: null,
  isAnonymous: false,
  name: 'Test User',
}

const fakeSession: AuthResult = {
  session: {
    expiresAt: new Date('2030-01-01T00:00:00.000Z'),
    token: 'test_session_token',
    userId: fakeUser.id,
  },
  user: fakeUser,
}

class FakeAuth extends AuthenticationPort {
  async changePassword(): Promise<void> {}
  getOAuthUrl(): string {
    return ''
  }
  async getSession(token: null | string): Promise<AuthResult | null> {
    return token === fakeSession.session.token ? fakeSession : null
  }
  async getUserById(): Promise<AuthProviderUser | null> {
    return fakeUser
  }
  async requestPasswordReset(): Promise<void> {}
  async resetPassword(): Promise<void> {}
  async sendVerificationEmail(): Promise<void> {}
  async signIn(): Promise<AuthResult> {
    return fakeSession
  }
  async signInAnonymously(): Promise<AuthResult> {
    return fakeSession
  }
  async signOut(): Promise<void> {}
  async signUp(): Promise<AuthResult> {
    return fakeSession
  }
  async updateUser(): Promise<AuthProviderUser> {
    return fakeUser
  }
  async validateSession(): Promise<AuthResult> {
    return fakeSession
  }
  async verifyEmail(): Promise<void> {}
}

let db: PostgresJsDatabase<any>

function authCookie() {
  return `${AUTH_SESSION_TOKEN_COOKIE_NAME}=${fakeSession.session.token}`
}

test.group('Expenses routes | create → confirm → journal', (group) => {
  let cleanup: () => Promise<void>

  group.setup(async () => {
    const ctx = await setupTestDatabaseForGroup()
    cleanup = ctx.cleanup
    db = await app.container.make('drizzle')

    const auth = new FakeAuth()
    app.container.bindValue(AuthenticationPort, auth)
    app.container.bindValue('authAdapter', auth)
  })

  group.each.setup(async () => {
    await db.delete(journalEntries)
    await db.delete(expenses)
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

  test('concurrent confirm requests create only one journal entry', async ({ assert, client }) => {
    // Simultaneity test model:
    // - read phase is diagnostic
    // - conditional write arbitrates the winner
    // - transaction keeps winner workflow atomic
    await client.post('/expenses').header('cookie', authCookie()).redirects(0).form({
      amount: 73.5,
      category: 'Software',
      date: '2026-04-15',
      label: 'Concurrent confirm',
    })

    const [draft] = await db.select().from(expenses)
    const service = new ExpenseService(db)
    const results = await runSimultaneously([
      (waitAtBarrier) => service.confirmExpense(draft.id, { afterRead: waitAtBarrier }),
      (waitAtBarrier) => service.confirmExpense(draft.id, { afterRead: waitAtBarrier }),
    ])
    assert.equal(
      results.filter((result) => result.status === 'fulfilled').length,
      1,
      'only one confirm should win in simultaneous execution'
    )

    const [row] = await db.select().from(expenses).where(eq(expenses.id, draft.id))
    assert.equal(row.status, 'confirmed')

    const entries = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.expenseId, draft.id))

    assert.equal(entries.length, 1)
  })

  test('concurrent delete requests remove draft exactly once', async ({ assert, client }) => {
    // Simultaneity test model:
    // - read phase is diagnostic
    // - conditional delete arbitrates the winner
    // - transaction keeps winner workflow atomic
    await client.post('/expenses').header('cookie', authCookie()).redirects(0).form({
      amount: 12,
      category: 'Office',
      date: '2026-04-16',
      label: 'Concurrent delete',
    })

    const [draft] = await db.select().from(expenses)
    const service = new ExpenseService(db)
    const results = await runSimultaneously([
      (waitAtBarrier) => service.deleteExpense(draft.id, { afterRead: waitAtBarrier }),
      (waitAtBarrier) => service.deleteExpense(draft.id, { afterRead: waitAtBarrier }),
    ])
    assert.equal(
      results.filter((result) => result.status === 'fulfilled').length,
      1,
      'only one delete should win in simultaneous execution'
    )

    const rows = await db.select().from(expenses).where(eq(expenses.id, draft.id))
    assert.equal(rows.length, 0)
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

  test('expense service rejects invalid inputs outside HTTP', async ({ assert }) => {
    const service = new ExpenseService(db)

    await expectRejects(assert, () =>
      service.createExpense({
        amount: -1,
        category: 'Software',
        date: '2026-04-20',
        label: 'Negative amount',
      })
    )

    await expectRejects(assert, () =>
      service.createExpense({
        amount: 10,
        category: 'Invalid category',
        date: '2026-04-20',
        label: 'Category mismatch',
      })
    )

    await expectRejects(assert, () =>
      service.createExpense({
        amount: 10,
        category: 'Software',
        date: '2026-04-20',
        label: '   ',
      })
    )

    const rows = await db.select().from(expenses)
    assert.equal(rows.length, 0)
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

    const auth = new FakeAuth()
    app.container.bindValue(AuthenticationPort, auth)
    app.container.bindValue('authAdapter', auth)
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

    const auth = new FakeAuth()
    app.container.bindValue(AuthenticationPort, auth)
    app.container.bindValue('authAdapter', auth)
  })

  group.each.setup(async () => {
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
// Service: getSummary and listExpenses
// =============================================================================

test.group('Expenses service | getSummary and listExpenses', (group) => {
  let cleanup: () => Promise<void>
  let serviceDb: PostgresJsDatabase<any>
  let service: ExpenseService

  group.setup(async () => {
    const ctx = await setupTestDatabaseForGroup()
    cleanup = ctx.cleanup
    serviceDb = await app.container.make('drizzle')
    service = new ExpenseService(serviceDb)
  })

  group.each.setup(async () => {
    await serviceDb.delete(journalEntries)
    await serviceDb.delete(expenses)
  })

  group.teardown(async () => cleanup())

  test('getSummary counts drafts and confirmed separately', async ({ assert }) => {
    await service.createExpense({
      amount: 100,
      category: 'Software',
      date: '2026-04-01',
      label: 'A',
    })
    await service.createExpense({ amount: 200, category: 'Office', date: '2026-04-02', label: 'B' })
    const [draft] = await serviceDb.select().from(expenses).orderBy(desc(expenses.createdAt))
    await service.confirmExpense(draft.id)

    const summary = await service.getSummary()
    assert.equal(summary.totalCount, 2)
    assert.equal(summary.confirmedCount, 1)
    assert.equal(summary.draftCount, 1)
    assert.equal(summary.totalAmount, 200, 'totalAmount should include only confirmed expenses')
  })

  test('getSummary respects dateFilter', async ({ assert }) => {
    await service.createExpense({
      amount: 50,
      category: 'Travel',
      date: '2026-03-01',
      label: 'Outside range',
    })
    await service.createExpense({
      amount: 75,
      category: 'Travel',
      date: '2026-04-10',
      label: 'Inside range',
    })
    const [inside] = await serviceDb
      .select()
      .from(expenses)
      .where(eq(expenses.label, 'Inside range'))
    await service.confirmExpense(inside.id)

    const summary = await service.getSummary({ endDate: '2026-04-30', startDate: '2026-04-01' })
    assert.equal(summary.totalCount, 1)
    assert.equal(summary.confirmedCount, 1)
    assert.equal(summary.totalAmount, 75)
  })

  test('listExpenses returns empty state with valid pagination', async ({ assert }) => {
    const result = await service.listExpenses(1, 5)
    assert.equal(result.items.length, 0)
    assert.equal(result.pagination.totalItems, 0)
    assert.equal(result.pagination.totalPages, 1, 'totalPages must be at least 1')
    assert.equal(result.pagination.page, 1)
  })

  test('listExpenses clamps out-of-bound page to last valid page', async ({ assert }) => {
    for (let i = 1; i <= 3; i++) {
      await service.createExpense({
        amount: i * 10,
        category: 'Software',
        date: '2026-04-01',
        label: `Expense ${i}`,
      })
    }

    // 3 items, perPage=2 → totalPages=2. Requesting page=99 should clamp to 2.
    const result = await service.listExpenses(99, 2)
    assert.equal(result.pagination.totalPages, 2)
    assert.equal(result.pagination.page, 2)
    assert.equal(result.items.length, 1, 'page 2 of 3 items with perPage=2 has 1 item')
  })

  test('cannot confirm an already-confirmed expense', async ({ assert, client }) => {
    const auth = new FakeAuth()
    app.container.bindValue(AuthenticationPort, auth)
    app.container.bindValue('authAdapter', auth)

    await service.createExpense({
      amount: 40,
      category: 'Office',
      date: '2026-04-01',
      label: 'Re-confirm test',
    })
    const [draft] = await serviceDb.select().from(expenses)
    await service.confirmExpense(draft.id)

    // Second confirm: should raise a domain error, not throw a 500
    const response = await client
      .post(`/expenses/${draft.id}/confirm-draft`)
      .header('cookie', authCookie())
      .redirects(0)
      .form({})
    response.assertStatus(302)

    // Only one journal entry must exist
    const entries = await serviceDb
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.expenseId, draft.id))
    assert.equal(entries.length, 1, 'a second confirm must not create a second journal entry')
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

    const auth = new FakeAuth()
    app.container.bindValue(AuthenticationPort, auth)
    app.container.bindValue('authAdapter', auth)
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
})
