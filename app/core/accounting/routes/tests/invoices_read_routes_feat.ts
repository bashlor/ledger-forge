import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { InvoiceService } from '#core/accounting/application/invoices/index'
import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'

import { setupTestDatabaseForGroup } from '../../../../../tests/helpers/testcontainers_db.js'
import {
  authCookie,
  bindInvoiceAuth,
  createDraftViaService,
  inertiaGet,
  inertiaProps,
  resetInvoiceAuthContext,
  resetInvoiceFixtures,
  seedInvoiceActor,
  seedTestOrganization,
  setInvoiceActorRole,
} from './invoices_test_support.js'

let db: PostgresJsDatabase<any>

test.group('Invoices routes | GET /invoices', (group) => {
  let cleanup: () => Promise<void>

  group.setup(async () => {
    const ctx = await setupTestDatabaseForGroup()
    cleanup = ctx.cleanup
    db = await app.container.make('drizzle')
    await seedTestOrganization(db)
    await seedInvoiceActor(db)
  })

  group.each.setup(async () => {
    resetInvoiceAuthContext()
    bindInvoiceAuth()
    await resetInvoiceFixtures(db)
    await setInvoiceActorRole(db, 'admin')
  })

  group.teardown(async () => cleanup())

  test('contract: GET /invoices returns minimal Inertia page contract', async ({
    assert,
    client,
  }) => {
    const service = new InvoiceService(db)
    await createDraftViaService(service, { issueDate: '2099-04-01' })

    const response = await inertiaGet(client, '/invoices')

    response.assertStatus(200)
    assert.equal(response.body().component, 'app/invoices')

    const props = inertiaProps(response)
    assert.property(props, 'invoices')
    assert.property(props.invoices, 'items')
    assert.property(props.invoices, 'pagination')
  })

  test('contract: GET /invoices returns 403 for an inactive membership', async ({ client }) => {
    await setInvoiceActorRole(db, 'member', false)

    const response = await inertiaGet(client, '/invoices').redirects(0)

    response.assertStatus(403)
  })

  test('GET /invoices with only startDate redirects back with validation errors', async ({
    client,
  }) => {
    const response = await client
      .get('/invoices')
      .header('cookie', authCookie())
      .qs({ startDate: '2026-04-01' })
      .redirects(0)

    response.assertStatus(302)
  })

  test('GET /invoices with only endDate redirects back with validation errors', async ({
    client,
  }) => {
    const response = await client
      .get('/invoices')
      .header('cookie', authCookie())
      .qs({ endDate: '2026-04-30' })
      .redirects(0)

    response.assertStatus(302)
  })

  test('GET /invoices rejects inverted date ranges', async ({ client }) => {
    const response = await client
      .get('/invoices')
      .header('cookie', authCookie())
      .qs({ endDate: '2026-04-01', startDate: '2026-04-30' })
      .redirects(0)

    response.assertStatus(302)
  })

  test('GET /invoices with mode=new exposes create mode in inertia props', async ({
    assert,
    client,
  }) => {
    const response = await inertiaGet(client, '/invoices?mode=new')

    response.assertStatus(200)

    const props = inertiaProps(response)
    assert.equal(props.mode, 'new')
    assert.isNull(props.initialInvoiceId)
    assert.isNull(props.initialCustomerId)
  })
})
