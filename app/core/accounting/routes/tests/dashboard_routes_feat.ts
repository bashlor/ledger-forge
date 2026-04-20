import { type DashboardDto, DashboardService } from '#core/accounting/application/dashboard/index'
import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'

import {
  seedTestOrganization,
  setupTestDatabaseForGroup,
} from '../../../../../tests/helpers/testcontainers_db.js'
import { authCookie, bindInvoiceAuth, inertiaHeaders } from './invoices_test_support.js'

test.group('Dashboard routes', (group) => {
  let cleanup: () => Promise<void>

  group.setup(async () => {
    const ctx = await setupTestDatabaseForGroup()
    cleanup = ctx.cleanup

    const db = (await app.container.make('drizzle')) as any
    await seedTestOrganization(db)
  })

  group.teardown(async () => cleanup())

  group.each.setup(() => {
    bindInvoiceAuth()
  })

  test('GET /dashboard renders the dashboard page with stubbed dashboard props', async ({
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

    app.container.bindValue(DashboardService, dashboardService)

    const response = await inertiaHeaders(client.get('/dashboard')).header('cookie', authCookie())

    response.assertStatus(200)
    assert.equal(response.body().component, 'app/dashboard')
    assert.deepEqual(response.body().props.dashboard, dashboard)
    assert.equal(calls, 1)
  })
})
