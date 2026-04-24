import { DemoDatasetService } from '#core/accounting/application/demo/demo_dataset_service'
import {
  DEMO_CONFIRMED_EXPENSE_COUNT,
  DEMO_CUSTOMER_COUNT,
  DEMO_EXPENSE_COUNT,
  DEMO_INVOICE_COUNT,
  DEMO_ISSUED_INVOICE_COUNT,
  DEMO_PAID_INVOICE_COUNT,
} from '#core/accounting/application/demo/demo_dataset_service'
import { systemAccessContext } from '#core/accounting/application/support/access_context'
import * as schema from '#core/common/drizzle/index'
import env from '#start/env'
import { test } from '@japa/runner'
import { count, eq } from 'drizzle-orm'

import {
  bindTestServices,
  createTestPostgresContext,
} from '../../../../tests/helpers/test_postgres.js'
import { DemoModeService } from './demo_mode_service.js'
import { seedProvisionedWorkspaceDemoData } from './demo_workspace_bootstrap.js'
import {
  ensureSingleTenantMembership,
  provisionPersonalWorkspace,
} from './workspace_provisioning.js'

async function assertOkJson<T>(res: Response): Promise<T> {
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`Expected OK, got ${res.status}: ${text}`)
  }
  return JSON.parse(text) as T
}

function authUrl(path: string): URL {
  const base = env.get('APP_URL')
  return new URL(path, base.endsWith('/') ? base : `${base}/`)
}

async function postAuth(
  betterAuth: { handler: (request: Request) => Promise<Response> },
  path: string,
  body: Record<string, unknown>,
  cookieHeader?: string
): Promise<Response> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    origin: env.get('APP_URL'),
  }
  if (cookieHeader) {
    headers.cookie = cookieHeader
  }
  return betterAuth.handler(
    new Request(authUrl(path), {
      body: JSON.stringify(body),
      headers,
      method: 'POST',
    })
  )
}

test.group('Workspace provisioning (integration)', (group) => {
  let context: Awaited<ReturnType<typeof createTestPostgresContext>>

  group.setup(async () => {
    context = await createTestPostgresContext()
    bindTestServices(context)
  })

  group.each.setup(async () => {
    await context.reset()
  })

  group.teardown(async () => {
    await context.cleanup()
  })

  test('provisionPersonalWorkspace creates personal org after email sign-up', async ({
    assert,
  }) => {
    const signUpRes = await postAuth(context.betterAuth, '/api/auth/sign-up/email', {
      email: 'provision@example.com',
      name: 'Pat User',
      password: 'SecureP@ss123',
    })
    const signedUp = await assertOkJson<{ user: { id: string } }>(signUpRes)
    const userId = signedUp.user.id

    const sessionBefore = await context.db.query.session.findFirst({
      where: (s, { eq: e }) => e(s.userId, userId),
    })
    assert.isNotNull(sessionBefore)
    assert.isNull(sessionBefore!.activeOrganizationId)

    const provisioning = await provisionPersonalWorkspace(context.db, {
      displayName: 'Pat User',
      email: 'provision@example.com',
      isAnonymous: false,
      sessionToken: sessionBefore!.token,
      userId,
    })
    assert.deepEqual(provisioning, {
      organizationId: provisioning.organizationId,
      wasProvisioned: true,
    })

    const sessionAfter = await context.db.query.session.findFirst({
      where: (s, { eq: e }) => e(s.userId, userId),
    })
    assert.isNotNull(sessionAfter)
    const orgId = sessionAfter!.activeOrganizationId
    assert.isString(orgId)

    const org = await context.db.query.organization.findFirst({
      where: (o, { eq: e }) => e(o.id, orgId!),
    })
    assert.isNotNull(org)
    assert.equal(org!.name, 'Pat User workspace')
    assert.include(org!.metadata ?? '', 'personal')

    const member = await context.db.query.member.findFirst({
      where: (m, { and: a, eq: e }) => a(e(m.userId, userId), e(m.organizationId, orgId!)),
    })
    assert.isNotNull(member)
    assert.equal(member!.role, 'owner')

    const auditRows = await context.db.query.auditEvents.findMany({
      where: (event, { and: a, eq: e }) =>
        a(
          e(event.action, 'member_workspace_provisioned'),
          e(event.entityId, member!.id),
          e(event.organizationId, orgId!)
        ),
    })
    assert.lengthOf(auditRows, 1)
  })

  test('provisionPersonalWorkspace creates anonymous workspace after anonymous sign-in', async ({
    assert,
  }) => {
    const anonRes = await postAuth(context.betterAuth, '/api/auth/sign-in/anonymous', {})
    const body = await assertOkJson<{ token: string; user: { id: string } }>(anonRes)
    const userId = body.user.id

    const provisioning = await provisionPersonalWorkspace(context.db, {
      isAnonymous: true,
      sessionToken: body.token,
      userId,
    })
    assert.deepEqual(provisioning, {
      organizationId: provisioning.organizationId,
      wasProvisioned: true,
    })

    const sessionRow = await context.db.query.session.findFirst({
      where: (s, { eq: e }) => e(s.token, body.token),
    })
    assert.isNotNull(sessionRow)
    const orgId = sessionRow!.activeOrganizationId
    assert.isString(orgId)

    const org = await context.db.query.organization.findFirst({
      where: eq(schema.organization.id, orgId!),
    })
    assert.isNotNull(org)
    assert.equal(org!.name, 'Anonymous workspace')
    assert.include(org!.metadata ?? '', 'anonymous')

    const member = await context.db.query.member.findFirst({
      where: (m, { and: a, eq: e }) => a(e(m.userId, userId), e(m.organizationId, orgId!)),
    })
    assert.isNotNull(member)
    assert.equal(member!.role, 'owner')
  })

  test('provisionPersonalWorkspace is idempotent when session already has active org', async ({
    assert,
  }) => {
    const signUpRes = await postAuth(context.betterAuth, '/api/auth/sign-up/email', {
      email: 'idempotent@example.com',
      name: 'Once',
      password: 'SecureP@ss123',
    })
    const signedUp = await assertOkJson<{ user: { id: string } }>(signUpRes)
    const userId = signedUp.user.id
    const sessionRow = await context.db.query.session.findFirst({
      where: (s, { eq: e }) => e(s.userId, userId),
    })
    assert.isNotNull(sessionRow)

    const firstProvisioning = await provisionPersonalWorkspace(context.db, {
      displayName: 'Once',
      email: 'idempotent@example.com',
      isAnonymous: false,
      sessionToken: sessionRow!.token,
      userId,
    })
    const afterFirst = await context.db.query.session.findFirst({
      where: (s, { eq: e }) => e(s.userId, userId),
    })
    const orgIdFirst = afterFirst!.activeOrganizationId

    const secondProvisioning = await provisionPersonalWorkspace(context.db, {
      displayName: 'Twice',
      email: 'idempotent@example.com',
      isAnonymous: false,
      sessionToken: sessionRow!.token,
      userId,
    })
    const afterSecond = await context.db.query.session.findFirst({
      where: (s, { eq: e }) => e(s.userId, userId),
    })
    assert.equal(afterSecond!.activeOrganizationId, orgIdFirst)
    assert.isTrue(firstProvisioning.wasProvisioned)
    assert.isFalse(secondProvisioning.wasProvisioned)
    assert.equal(secondProvisioning.organizationId, orgIdFirst)

    const memberships = await context.db.query.member.findMany({
      where: (m, { eq: e }) => e(m.userId, userId),
    })
    assert.lengthOf(memberships, 1)
  })

  test('provisionPersonalWorkspace does not create duplicate workspaces under concurrency', async ({
    assert,
  }) => {
    const signUpRes = await postAuth(context.betterAuth, '/api/auth/sign-up/email', {
      email: 'parallel@example.com',
      name: 'Parallel',
      password: 'SecureP@ss123',
    })
    const signedUp = await assertOkJson<{ user: { id: string } }>(signUpRes)
    const userId = signedUp.user.id
    const sessionRow = await context.db.query.session.findFirst({
      where: (s, { eq: e }) => e(s.userId, userId),
    })
    assert.isNotNull(sessionRow)

    await Promise.all([
      provisionPersonalWorkspace(context.db, {
        displayName: 'Parallel',
        email: 'parallel@example.com',
        isAnonymous: false,
        sessionToken: sessionRow!.token,
        userId,
      }),
      provisionPersonalWorkspace(context.db, {
        displayName: 'Parallel',
        email: 'parallel@example.com',
        isAnonymous: false,
        sessionToken: sessionRow!.token,
        userId,
      }),
    ])

    const organizations = await context.db.query.organization.findMany()
    const memberships = await context.db.query.member.findMany({
      where: (m, { eq: e }) => e(m.userId, userId),
    })
    const sessionAfter = await context.db.query.session.findFirst({
      where: (s, { eq: e }) => e(s.userId, userId),
    })

    assert.lengthOf(organizations, 1)
    assert.lengthOf(memberships, 1)
    assert.equal(sessionAfter!.activeOrganizationId, memberships[0]!.organizationId)
  })

  test('ensureSingleTenantMembership provisions the organization and makes the first user owner', async ({
    assert,
  }) => {
    const signUpRes = await postAuth(context.betterAuth, '/api/auth/sign-up/email', {
      email: 'single-owner@example.com',
      name: 'Single Owner',
      password: 'SecureP@ss123',
    })
    const signedUp = await assertOkJson<{ user: { id: string } }>(signUpRes)

    const provisioning = await ensureSingleTenantMembership(context.db, {
      displayName: 'Single Owner',
      email: 'single-owner@example.com',
      isAnonymous: false,
      orgId: 'org-single-test',
      userId: signedUp.user.id,
    })

    const organization = await context.db.query.organization.findFirst({
      where: (organizationRow, { eq: equal }) => equal(organizationRow.id, 'org-single-test'),
    })
    assert.isNotNull(organization)
    assert.deepEqual(provisioning, { organizationId: 'org-single-test', wasProvisioned: true })
    assert.equal(organization!.name, 'Single Owner workspace')
    assert.match(organization!.slug, /^single-/)

    const memberships = await context.db.query.member.findMany({
      where: (memberRow, { eq: equal }) => equal(memberRow.organizationId, 'org-single-test'),
    })
    assert.lengthOf(memberships, 1)
    assert.equal(memberships[0]!.role, 'owner')
    assert.equal(memberships[0]!.userId, signedUp.user.id)

    const auditRows = await context.db.query.auditEvents.findMany({
      where: (event, { and: a, eq: e }) =>
        a(
          e(event.action, 'member_workspace_provisioned'),
          e(event.entityId, memberships[0]!.id),
          e(event.organizationId, 'org-single-test')
        ),
    })
    assert.lengthOf(auditRows, 1)
  })

  test('ensureSingleTenantMembership reuses the single-tenant org and keeps later users as members', async ({
    assert,
  }) => {
    const firstRes = await postAuth(context.betterAuth, '/api/auth/sign-up/email', {
      email: 'single-first@example.com',
      name: 'Single First',
      password: 'SecureP@ss123',
    })
    const secondRes = await postAuth(context.betterAuth, '/api/auth/sign-up/email', {
      email: 'single-second@example.com',
      name: 'Single Second',
      password: 'SecureP@ss123',
    })
    const first = await assertOkJson<{ user: { id: string } }>(firstRes)
    const second = await assertOkJson<{ user: { id: string } }>(secondRes)

    await context.db.insert(schema.organization).values({
      createdAt: new Date(),
      id: 'legacy-single-org',
      logo: null,
      metadata: JSON.stringify({ workspaceKind: 'personal' }),
      name: 'Legacy Single',
      slug: 'single-org',
    })

    await ensureSingleTenantMembership(context.db, {
      displayName: 'Single First',
      email: 'single-first@example.com',
      isAnonymous: false,
      orgId: 'org-single-shared',
      userId: first.user.id,
    })
    await ensureSingleTenantMembership(context.db, {
      displayName: 'Single Second',
      email: 'single-second@example.com',
      isAnonymous: false,
      orgId: 'org-single-shared',
      userId: second.user.id,
    })
    const repeatedProvisioning = await ensureSingleTenantMembership(context.db, {
      displayName: 'Single Second',
      email: 'single-second@example.com',
      isAnonymous: false,
      orgId: 'org-single-shared',
      userId: second.user.id,
    })

    const organization = await context.db.query.organization.findFirst({
      where: (organizationRow, { eq: equal }) => equal(organizationRow.id, 'org-single-shared'),
    })
    assert.isNotNull(organization)
    assert.equal(organization!.name, 'Single First workspace')
    assert.notEqual(organization!.slug, 'single-org')
    assert.deepEqual(repeatedProvisioning, {
      organizationId: 'org-single-shared',
      wasProvisioned: false,
    })

    const memberships = await context.db.query.member.findMany({
      orderBy: (memberRow, { asc }) => [asc(memberRow.createdAt)],
      where: (memberRow, { eq: equal }) => equal(memberRow.organizationId, 'org-single-shared'),
    })

    assert.lengthOf(memberships, 2)
    assert.equal(memberships[0]!.role, 'owner')
    assert.equal(memberships[1]!.role, 'member')
    assert.equal(memberships[0]!.userId, first.user.id)
    assert.equal(memberships[1]!.userId, second.user.id)
  })

  test('demo mode seeds a single-tenant workspace with first owner and later members', async ({
    assert,
  }) => {
    const firstRes = await postAuth(context.betterAuth, '/api/auth/sign-up/email', {
      email: 'demo-single-first@example.com',
      name: 'Demo Single First',
      password: 'SecureP@ss123',
    })
    const secondRes = await postAuth(context.betterAuth, '/api/auth/sign-up/email', {
      email: 'demo-single-second@example.com',
      name: 'Demo Single Second',
      password: 'SecureP@ss123',
    })
    const first = await assertOkJson<{ user: { id: string } }>(firstRes)
    const second = await assertOkJson<{ user: { id: string } }>(secondRes)

    const firstProvisioning = await ensureSingleTenantMembership(context.db, {
      displayName: 'Demo Single First',
      email: 'demo-single-first@example.com',
      isAnonymous: false,
      orgId: 'org-single-demo',
      userId: first.user.id,
    })
    const secondProvisioning = await ensureSingleTenantMembership(context.db, {
      displayName: 'Demo Single Second',
      email: 'demo-single-second@example.com',
      isAnonymous: false,
      orgId: 'org-single-demo',
      userId: second.user.id,
    })

    const memberships = await context.db.query.member.findMany({
      orderBy: (memberRow, { asc }) => [asc(memberRow.createdAt)],
      where: (memberRow, { eq: equal }) => equal(memberRow.organizationId, 'org-single-demo'),
    })

    assert.lengthOf(memberships, 2)
    assert.equal(memberships[0]!.role, 'owner')
    assert.equal(memberships[1]!.role, 'member')

    const seeded = await seedProvisionedWorkspaceDemoData(
      context.db,
      firstProvisioning,
      new DemoModeService(true)
    )
    const seededAgain = await seedProvisionedWorkspaceDemoData(
      context.db,
      secondProvisioning,
      new DemoModeService(true)
    )

    assert.isTrue(seeded)
    assert.isFalse(seededAgain)

    const membershipsAfterSeed = await context.db.query.member.findMany({
      orderBy: (memberRow, { asc }) => [asc(memberRow.createdAt)],
      where: (memberRow, { eq: equal }) => equal(memberRow.organizationId, 'org-single-demo'),
    })

    assert.lengthOf(membershipsAfterSeed, 2)
    assert.equal(membershipsAfterSeed[0]!.role, 'owner')
    assert.equal(membershipsAfterSeed[1]!.role, 'member')

    const [customerCount] = await context.db
      .select({ value: count() })
      .from(schema.customers)
      .where(eq(schema.customers.organizationId, 'org-single-demo'))
    assert.equal(Number(customerCount?.value ?? 0), DEMO_CUSTOMER_COUNT)
  })

  test('ensureSingleTenantMembership upgrades an anonymous bootstrap to a named workspace', async ({
    assert,
  }) => {
    const anonRes = await postAuth(context.betterAuth, '/api/auth/sign-in/anonymous', {})
    const anon = await assertOkJson<{ token: string; user: { id: string } }>(anonRes)
    const signUpRes = await postAuth(context.betterAuth, '/api/auth/sign-up/email', {
      email: 'named@example.com',
      name: 'Named User',
      password: 'SecureP@ss123',
    })
    const signedUp = await assertOkJson<{ user: { id: string } }>(signUpRes)

    await ensureSingleTenantMembership(context.db, {
      isAnonymous: true,
      orgId: 'org-single-shared-upgrade',
      userId: anon.user.id,
    })
    const upgradedProvisioning = await ensureSingleTenantMembership(context.db, {
      displayName: 'Named User',
      email: 'named@example.com',
      isAnonymous: false,
      orgId: 'org-single-shared-upgrade',
      userId: signedUp.user.id,
    })

    const organization = await context.db.query.organization.findFirst({
      where: (organizationRow, { eq: equal }) =>
        equal(organizationRow.id, 'org-single-shared-upgrade'),
    })
    assert.isNotNull(organization)
    assert.equal(organization!.name, 'Named User workspace')
    assert.include(organization!.metadata ?? '', 'personal')
    assert.isTrue(upgradedProvisioning.wasProvisioned)

    const memberships = await context.db.query.member.findMany({
      orderBy: (memberRow, { asc }) => [asc(memberRow.createdAt)],
      where: (memberRow, { eq: equal }) =>
        equal(memberRow.organizationId, 'org-single-shared-upgrade'),
    })
    assert.lengthOf(memberships, 2)
    assert.equal(memberships[0]!.role, 'owner')
    assert.equal(memberships[1]!.role, 'member')
  })

  test('demo workspace bootstrap seeds newly provisioned workspaces only once', async ({
    assert,
  }) => {
    const signUpRes = await postAuth(context.betterAuth, '/api/auth/sign-up/email', {
      email: 'demo-bootstrap@example.com',
      name: 'Demo Bootstrap',
      password: 'SecureP@ss123',
    })
    const signedUp = await assertOkJson<{ user: { id: string } }>(signUpRes)
    const sessionRow = await context.db.query.session.findFirst({
      where: (s, { eq: e }) => e(s.userId, signedUp.user.id),
    })
    assert.isNotNull(sessionRow)

    const provisioning = await provisionPersonalWorkspace(context.db, {
      displayName: 'Demo Bootstrap',
      email: 'demo-bootstrap@example.com',
      isAnonymous: false,
      sessionToken: sessionRow!.token,
      userId: signedUp.user.id,
    })

    const seeded = await seedProvisionedWorkspaceDemoData(
      context.db,
      provisioning,
      new DemoModeService(true)
    )
    const seededAgain = await seedProvisionedWorkspaceDemoData(
      context.db,
      { ...provisioning, wasProvisioned: true },
      new DemoModeService(true)
    )

    const [customerCount] = await context.db
      .select({ value: count() })
      .from(schema.customers)
      .where(eq(schema.customers.organizationId, provisioning.organizationId!))
    const [invoiceCount] = await context.db
      .select({ value: count() })
      .from(schema.invoices)
      .where(eq(schema.invoices.organizationId, provisioning.organizationId!))
    const [expenseCount] = await context.db
      .select({ value: count() })
      .from(schema.expenses)
      .where(eq(schema.expenses.organizationId, provisioning.organizationId!))
    const [journalCount] = await context.db
      .select({ value: count() })
      .from(schema.journalEntries)
      .where(eq(schema.journalEntries.organizationId, provisioning.organizationId!))
    const [customerAuditCount] = await context.db
      .select({ value: count() })
      .from(schema.auditEvents)
      .where(eq(schema.auditEvents.organizationId, provisioning.organizationId!))
    const auditRows = await context.db
      .select({ entityType: schema.auditEvents.entityType, value: count() })
      .from(schema.auditEvents)
      .where(eq(schema.auditEvents.organizationId, provisioning.organizationId!))
      .groupBy(schema.auditEvents.entityType)
    const auditCounts = Object.fromEntries(
      auditRows.map((row) => [row.entityType, Number(row.value ?? 0)])
    )

    assert.isTrue(seeded)
    assert.isFalse(seededAgain)
    assert.equal(Number(customerCount?.value ?? 0), DEMO_CUSTOMER_COUNT)
    assert.equal(Number(invoiceCount?.value ?? 0), DEMO_INVOICE_COUNT)
    assert.equal(Number(expenseCount?.value ?? 0), DEMO_EXPENSE_COUNT)
    assert.equal(
      Number(journalCount?.value ?? 0),
      DEMO_CONFIRMED_EXPENSE_COUNT + DEMO_ISSUED_INVOICE_COUNT + DEMO_PAID_INVOICE_COUNT
    )
    assert.equal(auditCounts.customer, DEMO_CUSTOMER_COUNT)
    assert.equal(auditCounts.expense, DEMO_EXPENSE_COUNT + DEMO_CONFIRMED_EXPENSE_COUNT)
    assert.equal(
      auditCounts.invoice,
      DEMO_INVOICE_COUNT + DEMO_ISSUED_INVOICE_COUNT + DEMO_PAID_INVOICE_COUNT * 2
    )
    assert.equal(auditCounts.member, 1)
    assert.equal(
      Number(customerAuditCount?.value ?? 0),
      DEMO_CUSTOMER_COUNT +
        (DEMO_EXPENSE_COUNT + DEMO_CONFIRMED_EXPENSE_COUNT) +
        (DEMO_INVOICE_COUNT + DEMO_ISSUED_INVOICE_COUNT + DEMO_PAID_INVOICE_COUNT * 2) +
        1
    )
  })

  test('demo dataset reset replaces existing tenant records with the shared dataset', async ({
    assert,
  }) => {
    const signUpRes = await postAuth(context.betterAuth, '/api/auth/sign-up/email', {
      email: 'demo-reset@example.com',
      name: 'Demo Reset',
      password: 'SecureP@ss123',
    })
    const signedUp = await assertOkJson<{ user: { id: string } }>(signUpRes)
    const sessionRow = await context.db.query.session.findFirst({
      where: (s, { eq: e }) => e(s.userId, signedUp.user.id),
    })
    assert.isNotNull(sessionRow)

    const provisioning = await provisionPersonalWorkspace(context.db, {
      displayName: 'Demo Reset',
      email: 'demo-reset@example.com',
      isAnonymous: false,
      sessionToken: sessionRow!.token,
      userId: signedUp.user.id,
    })
    const tenantId = provisioning.organizationId!
    const dataset = new DemoDatasetService(context.db)
    const access = systemAccessContext(tenantId, 'demo-reset-test')

    await dataset.seedTenant(access)
    await dataset.resetTenant(access)

    const [customerCount] = await context.db
      .select({ value: count() })
      .from(schema.customers)
      .where(eq(schema.customers.organizationId, tenantId))
    const [invoiceCount] = await context.db
      .select({ value: count() })
      .from(schema.invoices)
      .where(eq(schema.invoices.organizationId, tenantId))
    const [expenseCount] = await context.db
      .select({ value: count() })
      .from(schema.expenses)
      .where(eq(schema.expenses.organizationId, tenantId))

    assert.equal(Number(customerCount?.value ?? 0), DEMO_CUSTOMER_COUNT)
    assert.equal(Number(invoiceCount?.value ?? 0), DEMO_INVOICE_COUNT)
    assert.equal(Number(expenseCount?.value ?? 0), DEMO_EXPENSE_COUNT)
  })
})
