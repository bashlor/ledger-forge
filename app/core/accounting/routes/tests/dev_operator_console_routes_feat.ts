import type { AuthResult } from '#core/user_management/domain/authentication'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { CustomerService } from '#core/accounting/application/customers/index'
import { InvoiceService } from '#core/accounting/application/invoices/index'
import { systemAccessContext } from '#core/accounting/application/support/access_context'
import {
  auditEvents,
  customers,
  expenses,
  invoices,
  journalEntries,
} from '#core/accounting/drizzle/schema'
import { AuthorizationService } from '#core/user_management/application/authorization_service'
import { DevToolsEnvironmentService } from '#core/user_management/application/dev_tools_environment_service'
import { member, organization, session } from '#core/user_management/drizzle/schema'
import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'
import { and, count, eq } from 'drizzle-orm'

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
  setAccountingAuthContext,
  TEST_ACCOUNTING_USER_EMAIL,
  TEST_ACCOUNTING_USER_ID,
  TEST_ACCOUNTING_USER_PUBLIC_ID,
} from './accounting_test_support.js'
import { inertiaHeaders } from './invoices_test_support.js'

const TENANT_B = 'dev-console-tenant-b'
const TENANT_C = 'dev-console-tenant-c'
const SESSION_TOKEN = 'dev_console_session_token'
const SECOND_USER_ID = 'dev-console-second-user'

class DevOperatorAuthorizationService extends AuthorizationService {
  override async actorFromSession(authSession?: AuthResult | null) {
    const actor = await super.actorFromSession(authSession)
    return { ...actor, isDevOperator: true }
  }
}

test.group('Dev operator console routes', (group) => {
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
      name: 'Dev Operator',
      publicId: TEST_ACCOUNTING_USER_PUBLIC_ID,
    })
    await seedTestUser(db, {
      email: 'member-two@example.local',
      id: SECOND_USER_ID,
      name: 'Second Member',
      publicId: 'pub_dev_console_second_user',
    })
    await db.insert(session).values({
      activeOrganizationId: TEST_TENANT_ID,
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
      id: 'dev-console-session',
      token: SESSION_TOKEN,
      userId: TEST_ACCOUNTING_USER_ID,
    })
    await db.insert(organization).values({
      id: TENANT_B,
      name: 'Tenant B',
      slug: 'tenant-b',
    })
    await db.insert(organization).values({
      id: TENANT_C,
      name: 'Tenant C',
      slug: 'tenant-c',
    })
    await seedTestMember(db, {
      id: 'dev-console-member-a',
      organizationId: TEST_TENANT_ID,
      role: 'admin',
      userId: TEST_ACCOUNTING_USER_ID,
    })
    await seedTestMember(db, {
      id: 'dev-console-member-b',
      organizationId: TENANT_B,
      role: 'member',
      userId: TEST_ACCOUNTING_USER_ID,
    })
    await seedTestMember(db, {
      id: 'dev-console-member-c',
      organizationId: TEST_TENANT_ID,
      role: 'member',
      userId: SECOND_USER_ID,
    })
  })

  group.each.setup(async () => {
    resetAccountingAuthContext()
    setAccountingAuthContext({
      organizationId: TEST_TENANT_ID,
      token: SESSION_TOKEN,
    })
    bindAccountingAuth()

    await db.delete(auditEvents)
    await db.delete(journalEntries)
    await db.delete(invoices)
    await db.delete(expenses)
    await db.delete(customers)
    await db
      .update(session)
      .set({ activeOrganizationId: TEST_TENANT_ID })
      .where(eq(session.token, SESSION_TOKEN))
    await db
      .update(member)
      .set({ isActive: true, role: 'admin' })
      .where(
        and(eq(member.userId, TEST_ACCOUNTING_USER_ID), eq(member.organizationId, TEST_TENANT_ID))
      )
  })

  group.each.teardown(() => {
    app.container.restore(AuthorizationService)
    app.container.restore(DevToolsEnvironmentService)
  })

  group.teardown(async () => cleanup())

  test('GET /_dev/inspector is forbidden when dev tools are disabled', async ({ client }) => {
    const response = await inertiaHeaders(client.get('/_dev/inspector'))
      .header('cookie', authCookie())
      .redirects(0)

    response.assertStatus(403)
  })

  test('GET /_dev/inspector renders the console for a dev operator in development', async ({
    assert,
    client,
  }) => {
    await enableDevOperatorMode(db)

    const response = await inertiaHeaders(client.get('/_dev/inspector'))
      .header('cookie', authCookie())
      .redirects(0)

    response.assertStatus(200)
    assert.equal(response.body().component, 'dev/inspector')
    assert.equal(response.body().props.inspector.context.activeTenantId, TEST_TENANT_ID)
    assert.equal(response.body().props.inspector.memberships.length, 2)
  })

  test('POST /_dev/inspector/active-tenant updates the stored active organization', async ({
    assert,
    client,
  }) => {
    await enableDevOperatorMode(db)

    const response = await client
      .post('/_dev/inspector/active-tenant')
      .header('cookie', authCookie())
      .redirects(0)
      .form({ tenantId: TENANT_B })

    response.assertStatus(302)

    const [storedSession] = await db
      .select({ activeOrganizationId: session.activeOrganizationId })
      .from(session)
      .where(eq(session.token, SESSION_TOKEN))
      .limit(1)

    assert.equal(storedSession?.activeOrganizationId, TENANT_B)
  })

  test('POST /_dev/inspector/actions/generate-demo-data seeds tenant-scoped records', async ({
    assert,
    client,
  }) => {
    await enableDevOperatorMode(db)

    const response = await client
      .post('/_dev/inspector/actions/generate-demo-data')
      .header('cookie', authCookie())
      .redirects(0)
      .form({})

    response.assertStatus(302)

    const [customerCount] = await db
      .select({ value: count() })
      .from(customers)
      .where(eq(customers.organizationId, TEST_TENANT_ID))
    const [invoiceCount] = await db
      .select({ value: count() })
      .from(invoices)
      .where(eq(invoices.organizationId, TEST_TENANT_ID))
    const [expenseCount] = await db
      .select({ value: count() })
      .from(expenses)
      .where(eq(expenses.organizationId, TEST_TENANT_ID))
    const [auditCount] = await db
      .select({ value: count() })
      .from(auditEvents)
      .where(eq(auditEvents.organizationId, TEST_TENANT_ID))

    assert.isAbove(Number(customerCount?.value ?? 0), 0)
    assert.isAbove(Number(invoiceCount?.value ?? 0), 0)
    assert.isAbove(Number(expenseCount?.value ?? 0), 0)
    assert.isAbove(Number(auditCount?.value ?? 0), 0)
  })

  test('POST /_dev/inspector/actions/create-tenant-scenario creates a full scenario tenant', async ({
    assert,
    client,
  }) => {
    await enableDevOperatorMode(db)

    const organizationsBefore = await db.select({ id: organization.id }).from(organization)

    const response = await client
      .post('/_dev/inspector/actions/create-tenant-scenario')
      .header('cookie', authCookie())
      .redirects(0)
      .form({})

    response.assertStatus(302)

    const organizationIdsBefore = new Set(organizationsBefore.map((row) => row.id))
    const organizationsAfter = await db
      .select({ id: organization.id, name: organization.name })
      .from(organization)
    const createdOrganization = organizationsAfter.find((row) => !organizationIdsBefore.has(row.id))

    assert.exists(createdOrganization)
    assert.include(createdOrganization!.name, 'Dev Scenario')

    const membersForCreatedOrganization = await db
      .select({ isActive: member.isActive, role: member.role, userId: member.userId })
      .from(member)
      .where(eq(member.organizationId, createdOrganization!.id))

    assert.lengthOf(membersForCreatedOrganization, 5)
    assert.equal(membersForCreatedOrganization.filter((row) => row.role === 'owner').length, 1)
    assert.equal(membersForCreatedOrganization.filter((row) => row.role === 'admin').length, 1)
    assert.equal(membersForCreatedOrganization.filter((row) => row.role === 'member').length, 3)
    assert.equal(membersForCreatedOrganization.filter((row) => row.isActive === false).length, 1)
  })

  test('POST /_dev/inspector/actions/create-tenant-scenario-seeded seeds the created tenant', async ({
    assert,
    client,
  }) => {
    await enableDevOperatorMode(db)

    const organizationsBefore = await db.select({ id: organization.id }).from(organization)

    const response = await client
      .post('/_dev/inspector/actions/create-tenant-scenario-seeded')
      .header('cookie', authCookie())
      .redirects(0)
      .form({})

    response.assertStatus(302)

    const organizationIdsBefore = new Set(organizationsBefore.map((row) => row.id))
    const organizationsAfter = await db.select({ id: organization.id }).from(organization)
    const createdOrganization = organizationsAfter.find((row) => !organizationIdsBefore.has(row.id))

    assert.exists(createdOrganization)

    const [customerCount] = await db
      .select({ value: count() })
      .from(customers)
      .where(eq(customers.organizationId, createdOrganization!.id))
    const [expenseCount] = await db
      .select({ value: count() })
      .from(expenses)
      .where(eq(expenses.organizationId, createdOrganization!.id))
    const [invoiceCount] = await db
      .select({ value: count() })
      .from(invoices)
      .where(eq(invoices.organizationId, createdOrganization!.id))

    assert.isAbove(Number(customerCount?.value ?? 0), 0)
    assert.isAbove(Number(expenseCount?.value ?? 0), 0)
    assert.isAbove(Number(invoiceCount?.value ?? 0), 0)
  })

  test('POST /_dev/inspector/actions/clear-tenant-data is blocked for member role', async ({
    assert,
    client,
  }) => {
    await enableDevOperatorMode(db)
    await seedDraftInvoice()
    await db
      .update(member)
      .set({ role: 'member' })
      .where(
        and(eq(member.userId, TEST_ACCOUNTING_USER_ID), eq(member.organizationId, TEST_TENANT_ID))
      )

    const response = await client
      .post('/_dev/inspector/actions/clear-tenant-data')
      .header('cookie', authCookie())
      .redirects(0)
      .form({})

    response.assertStatus(302)

    const [invoiceCount] = await db
      .select({ value: count() })
      .from(invoices)
      .where(eq(invoices.organizationId, TEST_TENANT_ID))

    assert.isAbove(Number(invoiceCount?.value ?? 0), 0)
  })

  test('POST /_dev/inspector/actions/reset-local-dataset keeps other tenants untouched', async ({
    assert,
    client,
  }) => {
    await enableDevOperatorMode(db)
    await seedDraftInvoice()
    const customerService = await app.container.make(CustomerService)
    await customerService.createCustomer(
      {
        address: '12 other tenant street',
        company: 'Tenant B Customer',
        email: 'tenant-b@example.local',
        name: 'Tenant B Customer',
        note: 'Should remain after reset',
        phone: '+33 6 88 88 88 88',
      },
      systemAccessContext(TENANT_B, 'dev-console-other-tenant')
    )

    const response = await client
      .post('/_dev/inspector/actions/reset-local-dataset')
      .header('cookie', authCookie())
      .redirects(0)
      .form({})

    response.assertStatus(302)

    const [tenantACustomers] = await db
      .select({ value: count() })
      .from(customers)
      .where(eq(customers.organizationId, TEST_TENANT_ID))
    const [tenantBCustomers] = await db
      .select({ value: count() })
      .from(customers)
      .where(eq(customers.organizationId, TENANT_B))

    assert.isAbove(Number(tenantACustomers?.value ?? 0), 0)
    assert.equal(Number(tenantBCustomers?.value ?? 0), 1)
  })

  test('POST /_dev/inspector/actions/unknown redirects back with validation flow', async ({
    client,
  }) => {
    await enableDevOperatorMode(db)

    const response = await client
      .post('/_dev/inspector/actions/not-a-real-action')
      .header('cookie', authCookie())
      .redirects(0)
      .form({})

    response.assertStatus(302)
    response.assertHeader('location', '/_dev/inspector')
  })

  test('POST /_dev/inspector/actions/attempt-forbidden-access records a denied audit event', async ({
    assert,
    client,
  }) => {
    await enableDevOperatorMode(db)
    await seedDraftInvoice()
    await db
      .update(member)
      .set({ role: 'member' })
      .where(
        and(eq(member.userId, TEST_ACCOUNTING_USER_ID), eq(member.organizationId, TEST_TENANT_ID))
      )

    const response = await client
      .post('/_dev/inspector/actions/attempt-forbidden-access')
      .header('cookie', authCookie())
      .redirects(0)
      .form({})

    response.assertStatus(302)

    const [deniedAudit] = await db
      .select({
        action: auditEvents.action,
        metadata: auditEvents.metadata,
      })
      .from(auditEvents)
      .where(
        and(
          eq(auditEvents.organizationId, TEST_TENANT_ID),
          eq(auditEvents.action, 'dev_denied_mark_paid')
        )
      )
      .limit(1)

    assert.equal(deniedAudit?.action, 'dev_denied_mark_paid')
    assert.equal((deniedAudit?.metadata as any)?.result, 'denied')
  })

  test('POST /_dev/inspector/actions/change-member-role stores member audit entity type', async ({
    assert,
    client,
  }) => {
    await enableDevOperatorMode(db)
    await db
      .update(member)
      .set({ role: 'owner' })
      .where(
        and(eq(member.userId, TEST_ACCOUNTING_USER_ID), eq(member.organizationId, TEST_TENANT_ID))
      )

    const response = await client
      .post('/_dev/inspector/actions/change-member-role')
      .header('cookie', authCookie())
      .redirects(0)
      .form({})

    response.assertStatus(302)

    const [roleAudit] = await db
      .select({ action: auditEvents.action, entityType: auditEvents.entityType })
      .from(auditEvents)
      .where(
        and(
          eq(auditEvents.organizationId, TEST_TENANT_ID),
          eq(auditEvents.action, 'dev_change_member_role')
        )
      )
      .limit(1)

    assert.equal(roleAudit?.entityType, 'member')
  })

  test('POST /_dev/inspector/actions rejects a forged tenant outside operator memberships', async ({
    assert,
    client,
  }) => {
    await enableDevOperatorMode(db)

    const response = await client
      .post('/_dev/inspector/actions/generate-demo-data')
      .header('cookie', authCookie())
      .redirects(0)
      .form({ tenantId: TENANT_C })

    response.assertStatus(302)

    const [customerCount] = await db
      .select({ value: count() })
      .from(customers)
      .where(eq(customers.organizationId, TENANT_C))

    assert.equal(Number(customerCount?.value ?? 0), 0)
  })

  test('POST /_dev/inspector/actions rejects a forged member outside the selected tenant', async ({
    assert,
    client,
  }) => {
    await enableDevOperatorMode(db)
    await db
      .update(member)
      .set({ role: 'owner' })
      .where(
        and(eq(member.userId, TEST_ACCOUNTING_USER_ID), eq(member.organizationId, TEST_TENANT_ID))
      )

    const response = await client
      .post('/_dev/inspector/actions/change-member-role')
      .header('cookie', authCookie())
      .redirects(0)
      .form({ memberId: 'dev-console-member-b', tenantId: TEST_TENANT_ID })

    response.assertStatus(302)

    const [roleAudit] = await db
      .select({ id: auditEvents.id })
      .from(auditEvents)
      .where(
        and(
          eq(auditEvents.organizationId, TEST_TENANT_ID),
          eq(auditEvents.action, 'dev_change_member_role')
        )
      )
      .limit(1)

    assert.isUndefined(roleAudit)
  })
})

async function enableDevOperatorMode(db: PostgresJsDatabase<any>) {
  app.container.swap(AuthorizationService, async () => {
    return new DevOperatorAuthorizationService(db)
  })
  app.container.swap(DevToolsEnvironmentService, async () => {
    return new DevToolsEnvironmentService(true)
  })
}

async function seedDraftInvoice() {
  const customerService = await app.container.make(CustomerService)
  const invoiceService = await app.container.make(InvoiceService)
  const access = systemAccessContext(TEST_TENANT_ID, 'dev-console-test')
  const customer = await customerService.createCustomer(
    {
      address: '10 rue de Test',
      company: 'Draft Customer',
      email: 'draft@example.local',
      name: 'Draft Customer',
      note: 'Seeded for dev console tests',
      phone: '+33 6 00 00 00 00',
    },
    access
  )

  await invoiceService.createDraft(
    {
      customerId: customer.id,
      dueDate: '2099-12-31',
      issueDate: todayUtc(),
      lines: [{ description: 'Draft line', quantity: 1, unitPrice: 100, vatRate: 20 }],
    },
    access
  )
}

function todayUtc(): string {
  const date = new Date()
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
