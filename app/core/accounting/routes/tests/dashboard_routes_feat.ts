import { type DashboardDto, DashboardService } from '#core/accounting/application/dashboard/index'
import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'

import {
  seedTestOrganization,
  setupTestDatabaseForGroup,
} from '../../../../../tests/helpers/testcontainers_db.js'
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
  })

  group.teardown(async () => await cleanup())

  group.each.setup(() => {
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
})
