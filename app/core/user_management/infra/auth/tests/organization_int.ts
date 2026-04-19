import * as schema from '#core/common/drizzle/index'
import { userIsMemberOfOrganization } from '#core/user_management/support/tenant_membership'
import env from '#start/env'
import { test } from '@japa/runner'
import { eq } from 'drizzle-orm'

import {
  bindTestServices,
  createTestPostgresContext,
} from '../../../../../../tests/helpers/test_postgres.js'

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

/**
 * Merge Set-Cookie values into a single `Cookie` header for the next request.
 * Better Auth session cookies are signed; raw `token` from JSON is not enough for `auth.api.*`.
 */
function cookieHeaderFromAuthResponse(res: Response): string {
  const headers = res.headers as Headers & { getSetCookie?: () => string[] }
  const list = typeof headers.getSetCookie === 'function' ? headers.getSetCookie() : []
  if (list.length > 0) {
    return list
      .map((c) => c.split(';')[0]?.trim())
      .filter(Boolean)
      .join('; ')
  }
  const fallback = res.headers.get('set-cookie')
  return fallback ? fallback.split(';')[0]!.trim() : ''
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

test.group('Better Auth organization (tenant) integration', (group) => {
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

  test('createOrganization adds owner member and sets active organization on session', async ({
    assert,
  }) => {
    const signUpRes = await postAuth(context.betterAuth, '/api/auth/sign-up/email', {
      email: 'owner@example.com',
      name: 'Owner',
      password: 'SecureP@ss123',
    })

    const signedUp = await assertOkJson<{ user: { id: string } }>(signUpRes)

    const jar = cookieHeaderFromAuthResponse(signUpRes)
    assert.isTrue(jar.length > 0)

    const createRes = await postAuth(
      context.betterAuth,
      '/api/auth/organization/create',
      {
        name: 'Acme Corp',
        slug: 'acme-corp-org-test',
      },
      jar
    )

    const created = await assertOkJson<{ id: string }>(createRes)
    const orgId = created.id
    assert.isString(orgId)
    const userId = signedUp.user.id

    const member = await context.db.query.member.findFirst({
      where: (m, { and: a, eq: e }) => a(e(m.userId, userId), e(m.organizationId, orgId)),
    })

    assert.isNotNull(member)
    assert.equal(member!.role, 'owner')

    const sessionRow = await context.db.query.session.findFirst({
      where: (s, { eq: e }) => e(s.userId, userId),
    })

    assert.isNotNull(sessionRow)
    assert.equal(sessionRow!.activeOrganizationId, orgId)

    const token = sessionRow!.token
    const viaAdapter = await context.authAdapter.getSession(token)
    assert.isNotNull(viaAdapter)
    assert.equal(viaAdapter!.session.activeOrganizationId, orgId)
  })

  test('setActiveOrganization switches tenant when user is a member', async ({ assert }) => {
    const signUpRes = await postAuth(context.betterAuth, '/api/auth/sign-up/email', {
      email: 'multi-a@example.com',
      name: 'Multi A',
      password: 'SecureP@ss123',
    })
    const signUpBody = await assertOkJson<{ user: { id: string } }>(signUpRes)
    let jar = cookieHeaderFromAuthResponse(signUpRes)

    const org1Res = await postAuth(
      context.betterAuth,
      '/api/auth/organization/create',
      {
        name: 'Org One',
        slug: 'org-one-mt',
      },
      jar
    )
    const org1 = await assertOkJson<{ id: string }>(org1Res)
    jar = cookieHeaderFromAuthResponse(org1Res) || jar

    const org2Res = await postAuth(
      context.betterAuth,
      '/api/auth/organization/create',
      {
        keepCurrentActiveOrganization: true,
        name: 'Org Two',
        slug: 'org-two-mt',
      },
      jar
    )
    await assertOkJson(org2Res)
    jar = cookieHeaderFromAuthResponse(org2Res) || jar

    const org2Row = await context.db.query.organization.findFirst({
      where: eq(schema.organization.slug, 'org-two-mt'),
    })
    assert.isNotNull(org2Row)

    let activeRes = await postAuth(
      context.betterAuth,
      '/api/auth/organization/set-active',
      {
        organizationId: org1.id,
      },
      jar
    )
    await assertOkJson(activeRes)
    jar = cookieHeaderFromAuthResponse(activeRes) || jar

    let sessionRow = await context.db.query.session.findFirst({
      where: (s, { eq: e }) => e(s.userId, signUpBody.user.id),
    })
    assert.equal(sessionRow!.activeOrganizationId, org1.id)

    activeRes = await postAuth(
      context.betterAuth,
      '/api/auth/organization/set-active',
      {
        organizationId: org2Row!.id,
      },
      jar
    )
    await assertOkJson(activeRes)

    sessionRow = await context.db.query.session.findFirst({
      where: (s, { eq: e }) => e(s.userId, signUpBody.user.id),
    })
    assert.equal(sessionRow!.activeOrganizationId, org2Row!.id)
  })

  test('non-member cannot activate another user organization', async ({ assert }) => {
    const resA = await postAuth(context.betterAuth, '/api/auth/sign-up/email', {
      email: 'iso-a@example.com',
      name: 'Iso A',
      password: 'SecureP@ss123',
    })
    await assertOkJson(resA)
    const jarA = cookieHeaderFromAuthResponse(resA)

    const createdRes = await postAuth(
      context.betterAuth,
      '/api/auth/organization/create',
      {
        name: 'Private Org',
        slug: 'private-org-iso',
      },
      jarA
    )
    const created = await assertOkJson<{ id: string }>(createdRes)
    const orgId = created.id

    const resB = await postAuth(context.betterAuth, '/api/auth/sign-up/email', {
      email: 'iso-b@example.com',
      name: 'Iso B',
      password: 'SecureP@ss123',
    })
    const bodyB = await assertOkJson<{ user: { id: string } }>(resB)
    const jarB = cookieHeaderFromAuthResponse(resB)

    const failRes = await postAuth(
      context.betterAuth,
      '/api/auth/organization/set-active',
      {
        organizationId: orgId,
      },
      jarB
    )

    assert.isFalse(failRes.ok)

    const memberCheck = await userIsMemberOfOrganization(context.db, bodyB.user.id, orgId)
    assert.isFalse(memberCheck)
  })
})
