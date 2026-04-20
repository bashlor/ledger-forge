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
  resetInvoiceFixtures,
  SECOND_CUSTOMER_ID,
  seedTestOrganization,
  TEST_CUSTOMER_ID,
} from './invoices_test_support.js'

let db: PostgresJsDatabase<any>

test.group('Invoices routes | GET /invoices', (group) => {
  let cleanup: () => Promise<void>

  group.setup(async () => {
    const ctx = await setupTestDatabaseForGroup()
    cleanup = ctx.cleanup
    db = await app.container.make('drizzle')
    await seedTestOrganization(db)
    bindInvoiceAuth()
  })

  group.each.setup(async () => {
    await resetInvoiceFixtures(db)
  })

  group.teardown(async () => cleanup())

  test('GET /invoices returns the first page ordered by issueDate desc then invoiceNumber desc', async ({
    assert,
    client,
  }) => {
    const service = new InvoiceService(db)
    const draftA = await createDraftViaService(service, { issueDate: '2026-04-01' })
    const draftB = await createDraftViaService(service, { issueDate: '2026-04-02' })
    const draftC = await createDraftViaService(service, { issueDate: '2026-04-03' })
    const draftD = await createDraftViaService(service, { issueDate: '2026-04-04' })
    const draftE = await createDraftViaService(service, { issueDate: '2026-04-05' })
    const draftF = await createDraftViaService(service, { issueDate: '2026-04-06' })

    const response = await inertiaGet(client, '/invoices')

    response.assertStatus(200)
    assert.equal(response.body().component, 'app/invoices')

    const props = inertiaProps(response)
    assert.equal(props.invoices.pagination.page, 1)
    assert.equal(props.invoices.pagination.perPage, 10)
    assert.equal(props.invoices.pagination.totalItems, 6)
    assert.equal(props.invoices.pagination.totalPages, 1)
    assert.deepEqual(
      props.invoices.items.map((item: any) => item.id),
      [draftF.id, draftE.id, draftD.id, draftC.id, draftB.id, draftA.id]
    )
  })

  test('GET /invoices clamps page when requested page exceeds total pages', async ({
    assert,
    client,
  }) => {
    const service = new InvoiceService(db)
    const draftA = await createDraftViaService(service, { issueDate: '2026-05-01' })
    await createDraftViaService(service, { issueDate: '2026-05-02' })
    await createDraftViaService(service, { issueDate: '2026-05-03' })
    await createDraftViaService(service, { issueDate: '2026-05-04' })
    await createDraftViaService(service, { issueDate: '2026-05-05' })
    await createDraftViaService(service, { issueDate: '2026-05-06' })

    const response = await inertiaGet(client, '/invoices?page=99')

    response.assertStatus(200)

    const props = inertiaProps(response)
    assert.equal(props.invoices.pagination.page, 1)
    assert.equal(props.invoices.pagination.totalPages, 1)
    assert.lengthOf(props.invoices.items, 6)
    assert.include(
      props.invoices.items.map((item: any) => item.id),
      draftA.id
    )
  })

  test('GET /invoices accepts custom perPage and reflects it in pagination', async ({
    assert,
    client,
  }) => {
    const service = new InvoiceService(db)
    for (let i = 1; i <= 6; i++) {
      await createDraftViaService(service, { issueDate: `2026-04-0${i}` })
    }

    const response = await inertiaGet(client, '/invoices?perPage=3')

    response.assertStatus(200)
    const props = inertiaProps(response)
    assert.equal(props.invoices.pagination.perPage, 3)
    assert.equal(props.invoices.pagination.totalPages, 2)
    assert.lengthOf(props.invoices.items, 3)
  })

  test('GET /invoices filters items by issueDate range', async ({ assert, client }) => {
    const service = new InvoiceService(db)
    const outsideBefore = await createDraftViaService(service, { issueDate: '2026-03-31' })
    const insideA = await createDraftViaService(service, { issueDate: '2026-04-01' })
    const insideB = await createDraftViaService(service, { issueDate: '2026-04-15' })
    const outsideAfter = await createDraftViaService(service, { issueDate: '2026-05-01' })

    const response = await inertiaGet(client, '/invoices?startDate=2026-04-01&endDate=2026-04-30')

    response.assertStatus(200)

    const props = inertiaProps(response)
    assert.equal(props.invoices.pagination.totalItems, 2)
    assert.deepEqual(
      props.invoices.items.map((item: any) => item.id),
      [insideB.id, insideA.id]
    )
    assert.notInclude(
      props.invoices.items.map((item: any) => item.id),
      outsideBefore.id
    )
    assert.notInclude(
      props.invoices.items.map((item: any) => item.id),
      outsideAfter.id
    )
  })

  test('GET /invoices filters items by search with coherent pagination', async ({ assert, client }) => {
    const service = new InvoiceService(db)
    const matching = await createDraftViaService(service, {
      customerId: TEST_CUSTOMER_ID,
      issueDate: '2026-04-10',
    })
    await createDraftViaService(service, {
      customerId: SECOND_CUSTOMER_ID,
      issueDate: '2026-04-11',
    })

    const response = await inertiaGet(client, '/invoices?search=Test%20Company')

    response.assertStatus(200)
    const props = inertiaProps(response)
    assert.include(
      props.invoices.items.map((item: any) => item.id),
      matching.id
    )
    assert.isTrue(
      props.invoices.items.every((item: any) =>
        item.customerCompanyName.toLowerCase().includes('test company')
      )
    )
    assert.equal(props.invoices.pagination.totalItems, props.invoices.items.length)
  })

  test('GET /invoices with customer sets initial customer and picks the latest invoice for that customer', async ({
    assert,
    client,
  }) => {
    const service = new InvoiceService(db)
    await createDraftViaService(service, {
      customerId: TEST_CUSTOMER_ID,
      issueDate: '2026-04-01',
    })
    const latestForFirstCustomer = await createDraftViaService(service, {
      customerId: TEST_CUSTOMER_ID,
      issueDate: '2026-04-20',
    })
    await createDraftViaService(service, {
      customerId: SECOND_CUSTOMER_ID,
      issueDate: '2026-04-25',
    })

    const response = await inertiaGet(client, `/invoices?customer=${TEST_CUSTOMER_ID}`)

    response.assertStatus(200)

    const props = inertiaProps(response)
    assert.equal(props.initialCustomerId, TEST_CUSTOMER_ID)
    assert.equal(props.initialInvoiceId, latestForFirstCustomer.id)
    assert.isTrue(props.invoices.items.every((item: any) => item.customerId === TEST_CUSTOMER_ID))
  })

  test('GET /invoices with explicit invoice injects the targeted invoice when it is outside the current page', async ({
    assert,
    client,
  }) => {
    const service = new InvoiceService(db)
    const target = await createDraftViaService(service, { issueDate: '2026-04-01' })
    await createDraftViaService(service, { issueDate: '2026-04-02' })
    await createDraftViaService(service, { issueDate: '2026-04-03' })
    await createDraftViaService(service, { issueDate: '2026-04-04' })
    await createDraftViaService(service, { issueDate: '2026-04-05' })
    await createDraftViaService(service, { issueDate: '2026-04-06' })

    const response = await inertiaGet(client, `/invoices?invoice=${target.id}`)

    response.assertStatus(200)

    const props = inertiaProps(response)
    assert.equal(props.initialInvoiceId, target.id)
    assert.equal(props.invoices.pagination.page, 1)
    assert.include(
      props.invoices.items.map((item: any) => item.id),
      target.id
    )
    assert.equal(props.invoices.items.length, 6)
  })

  test('GET /invoices with customer and date filter returns null initialInvoiceId and empty list when no invoice matches the scope', async ({
    assert,
    client,
  }) => {
    const service = new InvoiceService(db)
    await createDraftViaService(service, {
      customerId: TEST_CUSTOMER_ID,
      issueDate: '2026-03-15',
    })
    await createDraftViaService(service, {
      customerId: SECOND_CUSTOMER_ID,
      issueDate: '2026-04-10',
    })

    const response = await inertiaGet(
      client,
      `/invoices?customer=${TEST_CUSTOMER_ID}&startDate=2026-04-01&endDate=2026-04-30`
    )

    response.assertStatus(200)

    const props = inertiaProps(response)
    assert.equal(props.initialCustomerId, TEST_CUSTOMER_ID)
    assert.isNull(props.initialInvoiceId)
    assert.deepEqual(props.invoices.items, [])
  })

  test('GET /invoices does not inject an explicit invoice when it falls outside the current customer scope', async ({
    assert,
    client,
  }) => {
    const service = new InvoiceService(db)
    const otherCustomerInvoice = await createDraftViaService(service, {
      customerId: SECOND_CUSTOMER_ID,
      issueDate: '2026-04-01',
    })
    await createDraftViaService(service, { customerId: TEST_CUSTOMER_ID, issueDate: '2026-04-02' })
    await createDraftViaService(service, { customerId: TEST_CUSTOMER_ID, issueDate: '2026-04-03' })
    await createDraftViaService(service, { customerId: TEST_CUSTOMER_ID, issueDate: '2026-04-04' })
    await createDraftViaService(service, { customerId: TEST_CUSTOMER_ID, issueDate: '2026-04-05' })
    await createDraftViaService(service, { customerId: TEST_CUSTOMER_ID, issueDate: '2026-04-06' })
    const newestInPage = await createDraftViaService(service, {
      customerId: TEST_CUSTOMER_ID,
      issueDate: '2026-04-07',
    })

    const response = await inertiaGet(
      client,
      `/invoices?customer=${TEST_CUSTOMER_ID}&invoice=${otherCustomerInvoice.id}`
    )

    response.assertStatus(200)

    const props = inertiaProps(response)
    // The requested invoice id stays in UI state, but the page must not prepend
    // a record that is outside the current customer-scoped selection.
    assert.equal(props.initialCustomerId, TEST_CUSTOMER_ID)
    assert.equal(props.initialInvoiceId, otherCustomerInvoice.id)
    assert.equal(props.invoices.pagination.page, 1)
    assert.lengthOf(props.invoices.items, 6)
    assert.equal(props.invoices.items[0].id, newestInPage.id)
    assert.notInclude(
      props.invoices.items.map((item: any) => item.id),
      otherCustomerInvoice.id
    )
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
