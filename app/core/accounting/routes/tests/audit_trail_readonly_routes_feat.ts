import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import {
  ACCOUNTING_READ_ONLY_MESSAGE,
  AuditTrailHealthService,
} from '#core/accounting/application/audit/audit_trail_health_service'
import { InvoiceService } from '#core/accounting/application/invoices/index'
import {
  auditEvents,
  customers,
  expenses,
  invoices,
  journalEntries,
} from '#core/accounting/drizzle/schema'
import { member } from '#core/user_management/drizzle/schema'
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
  authCookie,
  bindAccountingAuth,
  resetAccountingAuthContext,
  TEST_ACCOUNTING_USER_EMAIL,
  TEST_ACCOUNTING_USER_ID,
  TEST_ACCOUNTING_USER_PUBLIC_ID,
} from './accounting_test_support.js'
import {
  createDraftViaService,
  inertiaGet,
  inertiaProps,
  issuePayload,
  resetInvoiceFixtures,
  TEST_CUSTOMER_ID,
} from './invoices_test_support.js'

function bindAuditTrailHealth(healthy: boolean) {
  app.container.bindValue(AuditTrailHealthService, {
    async getStatus() {
      return {
        healthy,
        message: healthy ? 'Audit trail storage is available.' : ACCOUNTING_READ_ONLY_MESSAGE,
      }
    },
    async isHealthy() {
      return healthy
    },
  } as AuditTrailHealthService)
}

test.group('Accounting routes | degraded audit trail mode', (group) => {
  let cleanup: () => Promise<void>
  let db: PostgresJsDatabase<any>

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
      id: 'member_degraded_accounting',
      organizationId: TEST_TENANT_ID,
      role: 'admin',
      userId: TEST_ACCOUNTING_USER_ID,
    })
  })

  group.each.setup(async () => {
    resetAccountingAuthContext()
    bindAccountingAuth()
    bindAuditTrailHealth(true)
    await resetInvoiceFixtures(db)
    await db.delete(auditEvents)
    await db.delete(journalEntries)
    await db.delete(expenses)
    await db
      .update(member)
      .set({ isActive: true, role: 'admin' })
      .where(eq(member.userId, TEST_ACCOUNTING_USER_ID))
  })

  group.teardown(async () => cleanup())

  test('GET read pages expose accountingReadOnly props when audit trail storage is degraded', async ({
    assert,
    client,
  }) => {
    bindAuditTrailHealth(false)

    const invoicesResponse = await inertiaGet(client, '/invoices')
    const expensesResponse = await client
      .get('/expenses')
      .header('cookie', authCookie())
      .header('x-inertia', 'true')
      .header('x-inertia-version', '1')
    const customersResponse = await client
      .get('/customers')
      .header('cookie', authCookie())
      .header('x-inertia', 'true')
      .header('x-inertia-version', '1')

    invoicesResponse.assertStatus(200)
    expensesResponse.assertStatus(200)
    customersResponse.assertStatus(200)

    const invoiceProps = inertiaProps(invoicesResponse)
    const expenseProps = expensesResponse.body().props
    const customerProps = customersResponse.body().props

    assert.isTrue(invoiceProps.accountingReadOnly)
    assert.equal(invoiceProps.accountingReadOnlyMessage, ACCOUNTING_READ_ONLY_MESSAGE)
    assert.isTrue(expenseProps.accountingReadOnly)
    assert.equal(expenseProps.accountingReadOnlyMessage, ACCOUNTING_READ_ONLY_MESSAGE)
    assert.isTrue(customerProps.accountingReadOnly)
    assert.equal(customerProps.accountingReadOnlyMessage, ACCOUNTING_READ_ONLY_MESSAGE)
  })

  test('GET /invoices/:id/history remains available in degraded mode', async ({
    assert,
    client,
  }) => {
    const service = new InvoiceService(db)
    const invoice = await createDraftViaService(service, { issueDate: '2026-05-10' })
    await service.issueInvoice(invoice.id, issuePayload(), {
      actorId: TEST_ACCOUNTING_USER_ID,
      isAnonymous: false,
      requestId: 'degraded-history',
      tenantId: TEST_TENANT_ID,
    })
    bindAuditTrailHealth(false)

    const response = await client
      .get(`/invoices/${invoice.id}/history`)
      .header('accept', 'application/json')
      .header('cookie', authCookie())
      .redirects(0)

    response.assertStatus(200)
    assert.deepEqual(
      response.body().events.map((event: any) => event.action),
      ['issue', 'create_draft']
    )
  })

  test('POST /invoices is blocked and leaves persisted data unchanged when degraded', async ({
    assert,
    client,
  }) => {
    bindAuditTrailHealth(false)

    const response = await client
      .post('/invoices')
      .header('cookie', authCookie())
      .header('referer', '/invoices')
      .redirects(0)
      .form({
        customerId: TEST_CUSTOMER_ID,
        dueDate: '2026-06-01',
        issueDate: '2026-05-01',
        'lines[0][description]': 'Blocked invoice',
        'lines[0][quantity]': 1,
        'lines[0][unitPrice]': 100,
        'lines[0][vatRate]': 20,
      })

    response.assertStatus(302)
    response.assertHeader('location', '/invoices')
    assert.lengthOf(await db.select().from(invoices), 0)
    assert.lengthOf(await db.select().from(auditEvents), 0)
  })

  test('POST /expenses is blocked and leaves persisted data unchanged when degraded', async ({
    assert,
    client,
  }) => {
    bindAuditTrailHealth(false)

    const response = await client
      .post('/expenses')
      .header('cookie', authCookie())
      .header('referer', '/expenses')
      .redirects(0)
      .form({
        amount: '20',
        category: 'office_supplies',
        date: '2026-05-01',
        label: 'Blocked expense',
      })

    response.assertStatus(302)
    response.assertHeader('location', '/expenses')
    assert.lengthOf(await db.select().from(expenses), 0)
    assert.lengthOf(await db.select().from(auditEvents), 0)
  })

  test('POST /customers is blocked and leaves persisted data unchanged when degraded', async ({
    assert,
    client,
  }) => {
    bindAuditTrailHealth(false)

    const response = await client
      .post('/customers')
      .header('cookie', authCookie())
      .header('referer', '/customers')
      .redirects(0)
      .form({
        address: '1 blocked street',
        company: 'Blocked Customer',
        email: 'blocked@example.com',
        name: 'Blocked User',
        phone: '+33 6 00 00 00 00',
      })

    response.assertStatus(302)
    response.assertHeader('location', '/customers')
    assert.lengthOf(await db.select().from(customers), 2)
    assert.lengthOf(await db.select().from(auditEvents), 0)
  })

  test('JSON writes return a 503 problem response when degraded', async ({ client }) => {
    bindAuditTrailHealth(false)

    const response = await client
      .post('/customers')
      .header('accept', 'application/json')
      .header('cookie', authCookie())
      .json({
        address: '1 blocked street',
        company: 'Blocked Customer',
        email: 'blocked@example.com',
        name: 'Blocked User',
        phone: '+33 6 00 00 00 00',
      })

    response.assertStatus(503)
    response.assertBodyContains({
      detail: ACCOUNTING_READ_ONLY_MESSAGE,
      status: 503,
      title: 'Service Unavailable',
      type: 'urn:accounting-app:error:audit-trail-degraded',
    })
  })
})
