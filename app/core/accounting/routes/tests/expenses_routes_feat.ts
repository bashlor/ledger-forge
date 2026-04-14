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
import { eq } from 'drizzle-orm'

import { runSimultaneously } from '../../../../../tests/helpers/concurrency_barrier.js'
import { setupTestDatabaseForGroup } from '../../../../../tests/helpers/testcontainers_db.js'

const fakeUser: AuthProviderUser = {
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  email: 'test@example.com',
  emailVerified: true,
  id: 'user_test',
  image: null,
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
})
