import type { AccountingAccessContext } from '#core/accounting/application/support/access_context'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { InvoiceService } from '#core/accounting/application/invoices/index'
import { customers } from '#core/accounting/drizzle/schema'
import { AuthorizationService } from '#core/user_management/application/authorization_service'
import { member, organization } from '#core/user_management/drizzle/schema'
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
  bindInvoiceAuth,
  createDraftViaService,
  dateOffsetFromTodayUtc,
  issuePayload,
  resetInvoiceAuthContext,
  resetInvoiceFixtures,
  TEST_CUSTOMER_ID,
  TEST_INVOICE_USER_EMAIL,
  TEST_INVOICE_USER_ID,
  TEST_INVOICE_USER_PUBLIC_ID,
} from './invoices_test_support.js'

const TEST_USER_ID = TEST_INVOICE_USER_ID
const TENANT_B = 'audit-history-tenant-b'

test.group('Invoices routes | GET /invoices/:id/history', (group) => {
  let cleanup: () => Promise<void>
  let db: PostgresJsDatabase<any>

  group.setup(async () => {
    const ctx = await setupTestDatabaseForGroup()
    cleanup = ctx.cleanup
    db = await app.container.make('drizzle')
    await seedTestOrganization(db)
    await seedTestUser(db, {
      email: TEST_INVOICE_USER_EMAIL,
      id: TEST_USER_ID,
      name: 'Test User',
      publicId: TEST_INVOICE_USER_PUBLIC_ID,
    })
    await seedTestMember(db, {
      id: 'member_test_invoices',
      organizationId: TEST_TENANT_ID,
      role: 'admin',
      userId: TEST_USER_ID,
    })
  })

  group.each.setup(async () => {
    resetInvoiceAuthContext()
    bindInvoiceAuth()
    await resetInvoiceFixtures(db)
    await db
      .update(member)
      .set({ isActive: true, role: 'admin' })
      .where(eq(member.userId, TEST_USER_ID))
  })

  group.each.teardown(() => {
    app.container.restore(AuthorizationService)
  })

  group.teardown(async () => cleanup())

  test('admin receives invoice history ordered by most recent event first', async ({
    assert,
    client,
  }) => {
    const issueDate = dateOffsetFromTodayUtc(10)
    const dueDate = dateOffsetFromTodayUtc(20)
    const service = new InvoiceService(db)
    const invoice = await createDraftViaService(service, { issueDate })

    await service.updateDraft(
      invoice.id,
      {
        customerId: TEST_CUSTOMER_ID,
        dueDate,
        issueDate,
        lines: [{ description: 'Updated work', quantity: 2, unitPrice: 120, vatRate: 20 }],
      },
      access()
    )
    await service.issueInvoice(invoice.id, issuePayload(), access())

    const response = await client
      .get(`/invoices/${invoice.id}/history`)
      .header('accept', 'application/json')
      .header('cookie', authCookie())
      .redirects(0)

    response.assertStatus(200)
    assert.deepEqual(
      response.body().events.map((event: any) => event.action),
      ['issue', 'update_draft', 'create_draft']
    )
  })

  test('regular member is forbidden from reading invoice history', async ({ client }) => {
    await db.update(member).set({ role: 'member' }).where(eq(member.userId, TEST_USER_ID))
    const service = new InvoiceService(db)
    const invoice = await createDraftViaService(service, { issueDate: dateOffsetFromTodayUtc(10) })

    const response = await client
      .get(`/invoices/${invoice.id}/history`)
      .header('accept', 'application/json')
      .header('cookie', authCookie())
      .redirects(0)

    response.assertStatus(403)
  })

  test('dev operator does not bypass audit history outside development mode', async ({
    client,
  }) => {
    await db.update(member).set({ role: 'member' }).where(eq(member.userId, TEST_USER_ID))
    app.container.swap(AuthorizationService, async () => {
      const drizzle = await app.container.make('drizzle')
      return new AuthorizationService(drizzle, false)
    })
    const service = new InvoiceService(db)
    const invoice = await createDraftViaService(service, { issueDate: dateOffsetFromTodayUtc(10) })

    const response = await client
      .get(`/invoices/${invoice.id}/history`)
      .header('accept', 'application/json')
      .header('cookie', authCookie())
      .redirects(0)

    response.assertStatus(403)
  })

  test('invoice history is not visible across tenants', async ({ client }) => {
    await db.insert(organization).values({
      id: TENANT_B,
      name: 'Audit History Tenant B',
      slug: 'audit-history-tenant-b',
    })
    await db.insert(customers).values({
      address: '2 rue Tenant B',
      company: 'Tenant B Co',
      email: 'tenant-b@example.com',
      id: 'audit-history-customer-b',
      name: 'Tenant B',
      organizationId: TENANT_B,
      phone: '+33 1 11 11 11 11',
    })

    const service = new InvoiceService(db)
    const issueDate = dateOffsetFromTodayUtc(10)
    const dueDate = dateOffsetFromTodayUtc(20)
    const invoice = await service.createDraft(
      {
        customerId: 'audit-history-customer-b',
        dueDate,
        issueDate,
        lines: [{ description: 'Tenant B work', quantity: 1, unitPrice: 100, vatRate: 20 }],
      },
      {
        actorId: TEST_USER_ID,
        isAnonymous: false,
        requestId: 'invoice-history-b',
        tenantId: TENANT_B,
      }
    )

    const response = await client
      .get(`/invoices/${invoice.id}/history`)
      .header('accept', 'application/json')
      .header('cookie', authCookie())
      .redirects(0)

    response.assertStatus(404)
  })
})

function access(): AccountingAccessContext {
  return {
    actorId: TEST_USER_ID,
    isAnonymous: false,
    requestId: 'invoice-history-test',
    tenantId: TEST_TENANT_ID,
  }
}
