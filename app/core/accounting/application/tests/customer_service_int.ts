import type { AccountingAccessContext } from '#core/accounting/application/support/access_context'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { listAuditEventsForEntity } from '#core/accounting/application/audit/audit_queries'
import { CustomerService } from '#core/accounting/application/customers/index'
import { auditEvents, customers, invoices, journalEntries } from '#core/accounting/drizzle/schema'
import { organization } from '#core/user_management/drizzle/schema'
import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'
import { eq } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'

import { expectRejects } from '../../../../../tests/helpers/expect_rejects.js'
import {
  seedTestOrganization,
  setupTestDatabaseForGroup,
  TEST_TENANT_ID,
} from '../../../../../tests/helpers/testcontainers_db.js'

let service: CustomerService
let db: PostgresJsDatabase<any>

const TEST_ACCOUNTING_ACCESS_CONTEXT: AccountingAccessContext = {
  actorId: 'test_actor',
  isAnonymous: false,
  requestId: 'test',
  tenantId: TEST_TENANT_ID,
}

async function truncateCustomers() {
  await db.delete(auditEvents)
  await db.delete(journalEntries)
  await db.delete(invoices)
  await db.delete(customers)
}

test.group('Customer service integration', (group) => {
  let cleanup: () => Promise<void>

  group.setup(async () => {
    const ctx = await setupTestDatabaseForGroup()
    cleanup = ctx.cleanup
    db = await app.container.make('drizzle')
    await seedTestOrganization(db)
    service = new CustomerService(db)
  })

  group.each.setup(async () => truncateCustomers())
  group.teardown(async () => cleanup())

  test('rejects blank company and contact details after trim', async ({ assert }) => {
    await expectRejects(assert, () =>
      service.createCustomer(
        {
          address: '5 rue des Tests, Paris',
          company: '   ',
          email: '   ',
          name: '   ',
          phone: '   ',
        },
        TEST_ACCOUNTING_ACCESS_CONTEXT
      )
    )

    const rows = await db.select().from(customers)
    assert.equal(rows.length, 0)
  })

  test('rejects update when both email and phone are blank after trim', async ({ assert }) => {
    const id = uuidv7()
    await db.insert(customers).values({
      address: '7 impasse du Port, Nantes',
      company: 'Kestrel Analytics',
      email: 'nina@kestrel.test',
      id,
      name: 'Nina Rossi',
      organizationId: TEST_TENANT_ID,
      phone: '+33 6 20 30 40 50',
    })

    await expectRejects(assert, () =>
      service.updateCustomer(
        id,
        {
          address: '8 impasse du Port, Nantes',
          company: 'Kestrel Analytics',
          email: '   ',
          name: 'Nina Rossi',
          phone: '   ',
        },
        TEST_ACCOUNTING_ACCESS_CONTEXT
      )
    )

    const [unchanged] = await db.select().from(customers).where(eq(customers.id, id))
    assert.equal(unchanged.email, 'nina@kestrel.test')
    assert.equal(unchanged.phone, '+33 6 20 30 40 50')
  })

  test('returns invoice counters in customer listing data', async ({ assert }) => {
    const linkedCustomerId = uuidv7()
    const freeCustomerId = uuidv7()

    await db.insert(customers).values([
      {
        address: 'Linked Address 2',
        company: 'Linked Company',
        email: 'linked-company@example.com',
        id: linkedCustomerId,
        name: 'Linked Person',
        organizationId: TEST_TENANT_ID,
        phone: '+1 555 0300',
      },
      {
        address: 'Free Address',
        company: 'Free Company',
        email: 'free-company@example.com',
        id: freeCustomerId,
        name: 'Free Person',
        organizationId: TEST_TENANT_ID,
        phone: '+1 555 0400',
      },
    ])

    await db.insert(invoices).values({
      customerCompanyAddressSnapshot: 'Linked Address 2',
      customerCompanyName: 'Linked Company',
      customerCompanySnapshot: 'Linked Company',
      customerEmailSnapshot: 'linked-company@example.com',
      customerId: linkedCustomerId,
      customerPhoneSnapshot: '+1 555 0300',
      customerPrimaryContactSnapshot: 'Linked Person',
      dueDate: '2026-05-15',
      id: uuidv7(),
      invoiceNumber: 'INV-2026-SERVICE-001',
      issueDate: '2026-05-01',
      issuedCompanyAddress: '',
      issuedCompanyName: '',
      organizationId: TEST_TENANT_ID,
      status: 'draft',
    })

    const { items } = await service.listCustomersPage(1, 10, TEST_ACCOUNTING_ACCESS_CONTEXT)
    const linked = items.find((entry) => entry.id === linkedCustomerId)
    const free = items.find((entry) => entry.id === freeCustomerId)

    assert.equal(linked?.invoiceCount, 1)
    assert.equal(linked?.canDelete, false)
    assert.equal(free?.invoiceCount, 0)
    assert.equal(free?.canDelete, true)
  })

  test('clamps invalid pagination inputs in customer listing', async ({ assert }) => {
    await db.insert(customers).values([
      {
        address: '1 test street',
        company: 'Alpha Co',
        email: 'alpha@example.com',
        id: uuidv7(),
        name: 'Alpha User',
        organizationId: TEST_TENANT_ID,
        phone: '+1 555 1000',
      },
      {
        address: '2 test street',
        company: 'Beta Co',
        email: 'beta@example.com',
        id: uuidv7(),
        name: 'Beta User',
        organizationId: TEST_TENANT_ID,
        phone: '+1 555 1001',
      },
      {
        address: '3 test street',
        company: 'Gamma Co',
        email: 'gamma@example.com',
        id: uuidv7(),
        name: 'Gamma User',
        organizationId: TEST_TENANT_ID,
        phone: '+1 555 1002',
      },
    ])

    const negativePage = await service.listCustomersPage(-4, 2, TEST_ACCOUNTING_ACCESS_CONTEXT)
    assert.equal(negativePage.pagination.page, 1)
    assert.equal(negativePage.pagination.perPage, 2)
    assert.equal(negativePage.items.length, 2)

    const oversizedPage = await service.listCustomersPage(999, 2, TEST_ACCOUNTING_ACCESS_CONTEXT)
    assert.equal(oversizedPage.pagination.page, 2)
    assert.equal(oversizedPage.pagination.totalPages, 2)
    assert.equal(oversizedPage.items.length, 1)

    const invalidPerPage = await service.listCustomersPage(1, 0, TEST_ACCOUNTING_ACCESS_CONTEXT)
    assert.equal(invalidPerPage.pagination.perPage, 1)
    assert.equal(invalidPerPage.items.length, 1)
  })

  test('applies server-side search with coherent pagination in customer listing', async ({
    assert,
  }) => {
    await db.insert(customers).values([
      {
        address: '1 test street',
        company: 'Cursor Labs',
        email: 'cursor@example.com',
        id: uuidv7(),
        name: 'Cursor User',
        organizationId: TEST_TENANT_ID,
        phone: '+1 555 1000',
      },
      {
        address: '2 test street',
        company: 'Other Company',
        email: 'other@example.com',
        id: uuidv7(),
        name: 'Other User',
        organizationId: TEST_TENANT_ID,
        phone: '+1 555 1001',
      },
    ])

    const result = await service.listCustomersPage(1, 10, TEST_ACCOUNTING_ACCESS_CONTEXT, 'cursor')

    assert.equal(result.items.length, 1)
    assert.equal(result.items[0].company, 'Cursor Labs')
    assert.equal(result.pagination.totalItems, 1)
    assert.equal(result.pagination.totalPages, 1)
  })

  test('deletes customer when invoices exist only for other tenant customers', async ({
    assert,
  }) => {
    const tenantAId = TEST_TENANT_ID
    const tenantBId = uuidv7()
    const tenantACustomerId = uuidv7()
    const tenantBCustomerId = uuidv7()
    await db
      .insert(organization)
      .values({ id: tenantBId, name: 'Tenant B', slug: `tenant-b-${uuidv7().slice(0, 8)}` })

    await db.insert(customers).values({
      address: '123 Scoped Street',
      company: 'Scoped Co',
      email: 'scoped@example.com',
      id: tenantACustomerId,
      name: 'Scoped Contact',
      organizationId: tenantAId,
      phone: '+33 1 22 33 44 55',
    })
    await db.insert(customers).values({
      address: 'Other Tenant Address',
      company: 'Other Tenant Co',
      email: 'other@example.com',
      id: tenantBCustomerId,
      name: 'Other Tenant Contact',
      organizationId: tenantBId,
      phone: '+33 1 00 00 00 00',
    })

    await db.insert(invoices).values({
      customerCompanyAddressSnapshot: 'Other Tenant Address',
      customerCompanyName: 'Other Tenant Co',
      customerCompanySnapshot: 'Other Tenant Co',
      customerEmailSnapshot: 'other@example.com',
      customerId: tenantBCustomerId,
      customerPhoneSnapshot: '+33 1 00 00 00 00',
      customerPrimaryContactSnapshot: 'Other Tenant Contact',
      dueDate: '2026-07-10',
      id: uuidv7(),
      invoiceNumber: 'INV-2026-CROSS-001',
      issueDate: '2026-07-01',
      issuedCompanyAddress: '',
      issuedCompanyName: '',
      organizationId: tenantBId,
      status: 'draft',
    })

    await service.deleteCustomer(tenantACustomerId, TEST_ACCOUNTING_ACCESS_CONTEXT)

    const [remaining] = await db.select().from(customers).where(eq(customers.id, tenantACustomerId))
    assert.isUndefined(remaining)
  })

  test('audit:create/update/delete customer events are emitted on happy path', async ({
    assert,
  }) => {
    const created = await service.createCustomer(
      {
        address: '1 rue Customer',
        company: 'Customer Audit Co',
        email: 'customer-audit@test.com',
        name: 'Customer Tester',
        note: 'Initial note',
        phone: '+33 1 00 00 00 03',
      },
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )
    await service.updateCustomer(
      created.id,
      {
        address: '1 rue Customer',
        company: 'Customer Audit Co 2',
        email: 'customer-audit@test.com',
        name: 'Customer Tester',
        note: 'Updated note',
        phone: '+33 1 00 00 00 03',
      },
      TEST_ACCOUNTING_ACCESS_CONTEXT
    )
    await service.deleteCustomer(created.id, TEST_ACCOUNTING_ACCESS_CONTEXT)

    const events = await listAuditEventsForEntity(db, {
      entityId: created.id,
      entityType: 'customer',
      tenantId: TEST_TENANT_ID,
    })
    assert.deepEqual(
      events.map((event) => event.action),
      ['delete', 'update', 'create']
    )
  })
})
