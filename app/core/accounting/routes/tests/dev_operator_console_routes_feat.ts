import type { AuthResult } from '#core/user_management/domain/authentication'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { CustomerService } from '#core/accounting/application/customers/index'
import { ExpenseService } from '#core/accounting/application/expenses/index'
import { InvoiceService } from '#core/accounting/application/invoices/index'
import { systemAccessContext } from '#core/accounting/application/support/access_context'
import {
  auditEvents,
  customers,
  expenses,
  invoices,
  journalEntries,
} from '#core/accounting/drizzle/schema'
import { DevOperatorConsolePageService } from '#core/dev_tools/application/dev_operator_console_page_service'
import { DevOperatorConsoleQueryService } from '#core/dev_tools/application/dev_operator_console_query_service'
import { DevOperatorConsoleService } from '#core/dev_tools/application/dev_operator_console_service'
import { AuthorizationService } from '#core/user_management/application/authorization_service'
import { DevToolsEnvironmentService } from '#core/user_management/application/dev_tools_environment_service'
import {
  AuthenticationPort,
  type AuthProviderUser,
} from '#core/user_management/domain/authentication'
import { member, organization, session, user } from '#core/user_management/drizzle/schema'
import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'
import { and, count, eq, ne } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'

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

function createDevTenantFactoryAuth(db: PostgresJsDatabase<any>) {
  return new (class extends AuthenticationPort {
    async changePassword(): Promise<void> {}
    getOAuthUrl(): string {
      return ''
    }
    async getSession(token: null | string): Promise<AuthResult | null> {
      if (!token) {
        return null
      }

      const [sessionRow] = await db
        .select({
          activeOrganizationId: session.activeOrganizationId,
          expiresAt: session.expiresAt,
          token: session.token,
          userId: session.userId,
        })
        .from(session)
        .where(eq(session.token, token))
        .limit(1)

      if (!sessionRow) {
        return null
      }

      const userRow = await this.getUserById(sessionRow.userId)
      if (!userRow) {
        return null
      }

      return {
        session: sessionRow,
        user: userRow,
      }
    }
    async getUserById(id: string): Promise<AuthProviderUser | null> {
      const [userRow] = await db
        .select({
          createdAt: user.createdAt,
          email: user.email,
          emailVerified: user.emailVerified,
          id: user.id,
          image: user.image,
          isAnonymous: user.isAnonymous,
          name: user.name,
          publicId: user.publicId,
        })
        .from(user)
        .where(eq(user.id, id))
        .limit(1)

      return userRow ?? null
    }
    async requestPasswordReset(): Promise<void> {}
    async resetPassword(): Promise<void> {}
    async sendVerificationEmail(): Promise<void> {}
    async signIn(): Promise<AuthResult> {
      throw new Error('Not implemented in test auth')
    }
    async signInAnonymously(): Promise<AuthResult> {
      throw new Error('Not implemented in test auth')
    }
    async signOut(): Promise<void> {}
    async signUp(email: string, _password: string, name?: string): Promise<AuthResult> {
      const userId = `tenant-owner-${uuidv7()}`
      const token = `tenant-owner-session-${uuidv7()}`
      const publicId = `pub_${uuidv7().replaceAll('-', '')}`

      await db.insert(user).values({
        createdAt: new Date(),
        email,
        emailVerified: true,
        id: userId,
        isAnonymous: false,
        name: name ?? email,
        publicId,
      })
      await db.insert(session).values({
        activeOrganizationId: null,
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
        id: `tenant-owner-session-id-${uuidv7()}`,
        token,
        userId,
      })

      return {
        session: {
          activeOrganizationId: null,
          expiresAt: new Date('2030-01-01T00:00:00.000Z'),
          token,
          userId,
        },
        user: {
          createdAt: new Date(),
          email,
          emailVerified: true,
          id: userId,
          image: null,
          isAnonymous: false,
          name: name ?? email,
          publicId,
        },
      }
    }
    async updateUser(): Promise<AuthProviderUser> {
      throw new Error('Not implemented in test auth')
    }
    async validateSession(token: string): Promise<AuthResult> {
      const authResult = await this.getSession(token)
      if (!authResult) {
        throw new Error('Session not found in test auth')
      }

      return authResult
    }
    async verifyEmail(): Promise<void> {}
  })()
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
      userId: SECOND_USER_ID,
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
    app.container.restore(AuthenticationPort)
    app.container.restore(AuthorizationService)
    app.container.restore(DevOperatorConsoleService)
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
    assert.equal(response.body().props.inspector.memberships.length, 1)
    assert.equal(response.body().props.inspector.inspectableTenants.length, 4)
  })

  test('GET /_dev/inspector disables tenant creation in single-tenant mode', async ({
    assert,
    client,
  }) => {
    await enableSingleTenantDevOperatorMode(db)

    const response = await inertiaHeaders(client.get('/_dev/inspector'))
      .header('cookie', authCookie())
      .redirects(0)

    response.assertStatus(200)
    assert.isTrue(response.body().props.inspector.context.singleTenantMode)
    const createTenantOperation = response
      .body()
      .props.inspector.globalOperations.find(
        (operation: { action: null | string; available: boolean }) =>
          operation.action === 'create-tenant'
      )
    assert.isFalse(createTenantOperation?.available ?? true)
  })

  test('GET /_dev/inspector applies auditSearch to audit events', async ({ assert, client }) => {
    await enableDevOperatorMode(db)
    await db.insert(auditEvents).values([
      {
        action: 'dev_search_target',
        actorId: TEST_ACCOUNTING_USER_ID,
        entityId: 'expense-search-hit',
        entityType: 'expense',
        id: 'audit-search-hit',
        organizationId: TEST_TENANT_ID,
      },
      {
        action: 'dev_other_event',
        actorId: TEST_ACCOUNTING_USER_ID,
        entityId: 'expense-search-miss',
        entityType: 'expense',
        id: 'audit-search-miss',
        organizationId: TEST_TENANT_ID,
      },
    ])

    const response = await inertiaHeaders(client.get('/_dev/inspector'))
      .qs({ auditSearch: 'search_target', tab: 'audit-trail', tenantId: TEST_TENANT_ID })
      .header('cookie', authCookie())
      .redirects(0)

    response.assertStatus(200)
    assert.equal(response.body().props.inspector.audit.events.length, 1)
    assert.equal(response.body().props.inspector.audit.events[0].id, 'audit-search-hit')
    assert.equal(response.body().props.inspector.audit.filters.search, 'search_target')
  })

  test('POST /_dev/inspector/active-tenant keeps the dev operator pinned to its session tenant', async ({
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

    assert.equal(storedSession?.activeOrganizationId, TEST_TENANT_ID)
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

  test('POST /_dev/inspector/actions/create-tenant creates an empty tenant with an isolated owner', async ({
    assert,
    client,
  }) => {
    await enableDevOperatorMode(db)
    app.container.bindValue(AuthenticationPort, createDevTenantFactoryAuth(db))

    const organizationsBefore = await db.select({ id: organization.id }).from(organization)

    const response = await client
      .post('/_dev/inspector/actions/create-tenant')
      .header('cookie', authCookie())
      .redirects(0)
      .form({
        ownerEmail: 'factory-owner@example.local',
        ownerPassword: 'SecureP@ss123',
        passwordConfirmation: 'SecureP@ss123',
        seedMode: 'empty',
        tenantName: 'Factory Empty Tenant',
      })

    response.assertStatus(302)

    const organizationIdsBefore = new Set(organizationsBefore.map((row) => row.id))
    const organizationsAfter = await db
      .select({ id: organization.id, name: organization.name, slug: organization.slug })
      .from(organization)
    const createdOrganization = organizationsAfter.find((row) => !organizationIdsBefore.has(row.id))

    assert.exists(createdOrganization)
    assert.equal(createdOrganization!.name, 'Factory Empty Tenant')
    assert.match(createdOrganization!.slug, /^[a-z]+-[a-z]+-[a-z]+-\d{3}$/)

    const membersForCreatedOrganization = await db
      .select({ isActive: member.isActive, role: member.role, userId: member.userId })
      .from(member)
      .where(eq(member.organizationId, createdOrganization!.id))

    assert.lengthOf(membersForCreatedOrganization, 1)
    assert.equal(membersForCreatedOrganization.filter((row) => row.role === 'owner').length, 1)
    assert.notEqual(membersForCreatedOrganization[0]?.userId, TEST_ACCOUNTING_USER_ID)
    assert.equal(membersForCreatedOrganization.filter((row) => row.isActive === false).length, 0)

    const [ownerSession] = await db
      .select({ token: session.token })
      .from(session)
      .where(ne(session.userId, TEST_ACCOUNTING_USER_ID))
      .limit(1)

    assert.isUndefined(ownerSession)
  })

  test('POST /_dev/inspector/actions/create-tenant seeds the created tenant when requested', async ({
    assert,
    client,
  }) => {
    await enableDevOperatorMode(db)
    app.container.bindValue(AuthenticationPort, createDevTenantFactoryAuth(db))

    const organizationsBefore = await db.select({ id: organization.id }).from(organization)

    const response = await client
      .post('/_dev/inspector/actions/create-tenant')
      .header('cookie', authCookie())
      .redirects(0)
      .form({
        ownerEmail: 'factory-owner-seeded@example.local',
        ownerPassword: 'SecureP@ss123',
        passwordConfirmation: 'SecureP@ss123',
        seedMode: 'seeded',
        tenantName: 'Factory Seeded Tenant',
      })

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

  test('POST /_dev/inspector/actions/create-tenant is blocked in single-tenant mode', async ({
    assert,
    client,
  }) => {
    await enableSingleTenantDevOperatorMode(db)
    app.container.bindValue(AuthenticationPort, createDevTenantFactoryAuth(db))

    const organizationsBefore = await db.select({ value: count() }).from(organization)

    const response = await client
      .post('/_dev/inspector/actions/create-tenant')
      .header('cookie', authCookie())
      .redirects(0)
      .form({
        ownerEmail: 'single-tenant-owner@example.local',
        ownerPassword: 'SecureP@ss123',
        passwordConfirmation: 'SecureP@ss123',
        seedMode: 'empty',
        tenantName: 'Blocked Tenant',
      })

    response.assertStatus(302)

    const organizationsAfter = await db.select({ value: count() }).from(organization)
    assert.equal(
      Number(organizationsAfter[0]?.value ?? 0),
      Number(organizationsBefore[0]?.value ?? 0)
    )
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

  test('POST /_dev/inspector/actions/delete-confirmed-expense leaves confirmed expenses untouched', async ({
    assert,
    client,
  }) => {
    await enableDevOperatorMode(db)

    const expenseService = await app.container.make(ExpenseService)
    const access = systemAccessContext(TEST_TENANT_ID, 'dev-console-confirmed-expense')
    const createdExpense = await expenseService.createExpense(
      {
        amount: 25,
        category: 'Travel',
        date: '2026-04-21',
        label: 'Confirmed deletion probe',
      },
      access
    )
    await expenseService.confirmExpense(createdExpense.id, access)
    await expenseService.createExpense(
      {
        amount: 12,
        category: 'Software',
        date: '2026-04-21',
        label: 'Draft fallback expense',
      },
      access
    )

    const response = await client
      .post('/_dev/inspector/actions/delete-confirmed-expense')
      .header('cookie', authCookie())
      .redirects(0)
      .form({})

    response.assertStatus(302)

    const expenseRows = await db
      .select({ id: expenses.id, status: expenses.status })
      .from(expenses)
      .where(eq(expenses.organizationId, TEST_TENANT_ID))

    assert.lengthOf(expenseRows, 2)
    assert.isTrue(
      expenseRows.some((row) => row.id === createdExpense.id && row.status === 'confirmed')
    )
    assert.equal(expenseRows.filter((row) => row.status === 'draft').length, 1)
  })

  test('POST /_dev/inspector/actions/toggle-member-active updates a non-owner member', async ({
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
      .post('/_dev/inspector/actions/toggle-member-active')
      .header('cookie', authCookie())
      .redirects(0)
      .form({})

    response.assertStatus(302)

    const [toggledMember] = await db
      .select({ isActive: member.isActive, role: member.role })
      .from(member)
      .where(eq(member.id, 'dev-console-member-c'))
      .limit(1)

    assert.equal(toggledMember?.role, 'member')
    assert.isFalse(toggledMember?.isActive ?? true)
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

    const [updatedMember] = await db
      .select({ role: member.role })
      .from(member)
      .where(eq(member.id, 'dev-console-member-c'))
      .limit(1)

    assert.equal(roleAudit?.entityType, 'member')
    assert.equal(updatedMember?.role, 'admin')
  })

  test('POST /_dev/inspector/actions/change-member-role does not demote the owner', async ({
    assert,
    client,
  }) => {
    await enableDevOperatorMode(db)
    await db.update(member).set({ role: 'owner' }).where(eq(member.id, 'dev-console-member-a'))

    const response = await client
      .post('/_dev/inspector/actions/change-member-role')
      .header('cookie', authCookie())
      .redirects(0)
      .form({ memberId: 'dev-console-member-a' })

    response.assertStatus(302)

    const [ownerMember] = await db
      .select({ role: member.role })
      .from(member)
      .where(eq(member.id, 'dev-console-member-a'))
      .limit(1)
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

    assert.equal(ownerMember?.role, 'owner')
    assert.isUndefined(roleAudit)
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

async function enableSingleTenantDevOperatorMode(db: PostgresJsDatabase<any>) {
  await enableDevOperatorMode(db)

  app.container.swap(DevOperatorConsoleService, async () => {
    return new DevOperatorConsoleService(db, {
      pageService: new DevOperatorConsolePageService(new DevOperatorConsoleQueryService(db), true),
      singleTenantMode: true,
    })
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
