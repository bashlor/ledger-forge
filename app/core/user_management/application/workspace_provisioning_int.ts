import * as schema from '#core/common/drizzle/index'
import env from '#start/env'
import { test } from '@japa/runner'
import { eq } from 'drizzle-orm'

import {
  bindTestServices,
  createTestPostgresContext,
} from '../../../../tests/helpers/test_postgres.js'
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

    await provisionPersonalWorkspace(context.db, {
      displayName: 'Pat User',
      email: 'provision@example.com',
      isAnonymous: false,
      sessionToken: sessionBefore!.token,
      userId,
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
  })

  test('provisionPersonalWorkspace creates anonymous workspace after anonymous sign-in', async ({
    assert,
  }) => {
    const anonRes = await postAuth(context.betterAuth, '/api/auth/sign-in/anonymous', {})
    const body = await assertOkJson<{ token: string; user: { id: string } }>(anonRes)
    const userId = body.user.id

    await provisionPersonalWorkspace(context.db, {
      isAnonymous: true,
      sessionToken: body.token,
      userId,
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

    await provisionPersonalWorkspace(context.db, {
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

    await provisionPersonalWorkspace(context.db, {
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

    await ensureSingleTenantMembership(context.db, signedUp.user.id, 'org-single-test')

    const organization = await context.db.query.organization.findFirst({
      where: (organizationRow, { eq: equal }) => equal(organizationRow.id, 'org-single-test'),
    })
    assert.isNotNull(organization)
    assert.match(organization!.slug, /^single-/)

    const memberships = await context.db.query.member.findMany({
      where: (memberRow, { eq: equal }) => equal(memberRow.organizationId, 'org-single-test'),
    })
    assert.lengthOf(memberships, 1)
    assert.equal(memberships[0]!.role, 'owner')
    assert.equal(memberships[0]!.userId, signedUp.user.id)
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

    await ensureSingleTenantMembership(context.db, first.user.id, 'org-single-shared')
    await ensureSingleTenantMembership(context.db, second.user.id, 'org-single-shared')
    await ensureSingleTenantMembership(context.db, second.user.id, 'org-single-shared')

    const organization = await context.db.query.organization.findFirst({
      where: (organizationRow, { eq: equal }) => equal(organizationRow.id, 'org-single-shared'),
    })
    assert.isNotNull(organization)
    assert.notEqual(organization!.slug, 'single-org')

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
})
