import { type DashboardDto, DashboardService } from '#core/accounting/application/dashboard/index'
import { devOperatorAccess, member } from '#core/user_management/drizzle/schema'
import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'
import { eq } from 'drizzle-orm'

import {
  seedTestMember,
  seedTestOrganization,
  seedTestUser,
  setupTestDatabaseForGroup,
  TEST_TENANT_ID,
} from '../../../../../tests/helpers/testcontainers_db.js'
import {
  TEST_ACCOUNTING_USER_EMAIL,
  TEST_ACCOUNTING_USER_ID,
  TEST_ACCOUNTING_USER_PUBLIC_ID,
} from './accounting_test_support.js'
import {
  authCookie,
  bindInvoiceAuth,
  inertiaHeaders,
  resetInvoiceAuthContext,
} from './invoices_test_support.js'

test.group('Dashboard routes', (group) => {
  let cleanup: () => Promise<void>

  group.setup(async () => {
    const ctx = await setupTestDatabaseForGroup()
    cleanup = ctx.cleanup

    const db = (await app.container.make('drizzle')) as any
    await seedTestOrganization(db)
    await seedTestUser(db, {
      email: TEST_ACCOUNTING_USER_EMAIL,
      id: TEST_ACCOUNTING_USER_ID,
      name: 'Test User',
      publicId: TEST_ACCOUNTING_USER_PUBLIC_ID,
    })
    await seedTestMember(db, {
      id: 'member_test_dashboard_actor',
      organizationId: TEST_TENANT_ID,
      role: 'admin',
      userId: TEST_ACCOUNTING_USER_ID,
    })
  })

  group.teardown(async () => await cleanup())

  group.each.setup(async () => {
    const db = (await app.container.make('drizzle')) as any
    await db
      .update(member)
      .set({ isActive: true, role: 'admin' })
      .where(eq(member.userId, TEST_ACCOUNTING_USER_ID))
    await db.delete(devOperatorAccess)

    resetInvoiceAuthContext()
    bindInvoiceAuth()
  })

  group.each.teardown(() => {
    app.container.restore(DashboardService)
  })

  test('GET /dashboard initial Inertia visit lists dashboard as deferred (no sync prop)', async ({
    assert,
    client,
  }) => {
    const dashboard: DashboardDto = {
      recentInvoices: [],
      summary: {
        profit: 0,
        totalCollected: 0,
        totalExpenses: 0,
        totalRevenue: 0,
      },
    }

    let calls = 0
    const dashboardService = {
      async getDashboard() {
        calls += 1
        return dashboard
      },
    } as unknown as DashboardService

    app.container.swap(DashboardService, async () => dashboardService)

    const response = await inertiaHeaders(client.get('/dashboard')).header('cookie', authCookie())

    response.assertStatus(200)
    assert.equal(response.body().component, 'app/dashboard')
    assert.deepEqual(response.body().deferredProps, { dashboard: ['dashboard'] })
    assert.isUndefined(response.body().props.dashboard)
    assert.equal(calls, 0, 'deferred prop must not run on the initial standard visit')
  })

  test('GET /dashboard partial request loads dashboard prop via deferred compute', async ({
    assert,
    client,
  }) => {
    const dashboard: DashboardDto = {
      recentInvoices: [
        {
          customerCompanyName: 'Acme Corp',
          date: '2026-04-01',
          dueDate: '2026-04-30',
          id: 'inv_123',
          invoiceNumber: 'INV-2026-001',
          status: 'issued',
          totalInclTax: 1200,
        },
      ],
      summary: {
        profit: 800,
        totalCollected: 400,
        totalExpenses: 200,
        totalRevenue: 1000,
      },
    }

    let calls = 0
    const dashboardService = {
      async getDashboard() {
        calls += 1
        return dashboard
      },
    } as unknown as DashboardService

    app.container.swap(DashboardService, async () => dashboardService)

    const response = await client
      .get('/dashboard')
      .header('cookie', authCookie())
      .header('x-inertia', 'true')
      .header('x-inertia-version', '1')
      .header('x-inertia-partial-component', 'app/dashboard')
      .header('x-inertia-partial-data', 'dashboard')

    response.assertStatus(200)
    assert.equal(response.body().component, 'app/dashboard')
    assert.deepEqual(response.body().props.dashboard, dashboard)
    assert.equal(calls, 1)
  })

  test('GET /dashboard returns 403 for an inactive membership', async ({ client }) => {
    const db = (await app.container.make('drizzle')) as any
    await db
      .update(member)
      .set({ isActive: false, role: 'member' })
      .where(eq(member.userId, TEST_ACCOUNTING_USER_ID))

    const response = await inertiaHeaders(client.get('/dashboard'))
      .header('cookie', authCookie())
      .redirects(0)

    response.assertStatus(403)
  })

  test('GET /dashboard returns 403 for a regular member', async ({ client }) => {
    const db = (await app.container.make('drizzle')) as any
    await db
      .update(member)
      .set({ isActive: true, role: 'member' })
      .where(eq(member.userId, TEST_ACCOUNTING_USER_ID))

    const response = await inertiaHeaders(client.get('/dashboard'))
      .header('cookie', authCookie())
      .redirects(0)

    response.assertStatus(403)
  })

  test('GET / redirects regular members to customers', async ({ client }) => {
    const db = (await app.container.make('drizzle')) as any
    await db
      .update(member)
      .set({ isActive: true, role: 'member' })
      .where(eq(member.userId, TEST_ACCOUNTING_USER_ID))

    const response = await client.get('/').header('cookie', authCookie()).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/customers')
  })

  test('GET / redirects dev operators to dev tools instead of accounting pages', async ({
    client,
  }) => {
    const db = (await app.container.make('drizzle')) as any
    await db.insert(devOperatorAccess).values({ userId: TEST_ACCOUNTING_USER_ID })

    const response = await client.get('/').header('cookie', authCookie()).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/_dev')
  })
})
