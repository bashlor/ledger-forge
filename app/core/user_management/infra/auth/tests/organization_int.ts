import * as schema from '#core/common/drizzle/index'
import env from '#start/env'
import { test } from '@japa/runner'
import { eq } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'

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

  test('keeps organization plugin endpoints out of the Better Auth HTTP surface', async ({
    assert,
  }) => {
    const signUpRes = await postAuth(context.betterAuth, '/api/auth/sign-up/email', {
      email: 'owner@example.com',
      name: 'Owner',
      password: 'SecureP@ss123',
    })
    const jar = cookieHeaderFromAuthResponse(signUpRes)
    assert.isTrue(jar.length > 0)

    const createRes = await postAuth(
      context.betterAuth,
      '/api/auth/organization/create',
      {
        name: 'Bypass Org',
        slug: 'bypass-org',
      },
      jar
    )

    assert.isFalse(createRes.ok)

    const organization = await context.db.query.organization.findFirst({
      where: eq(schema.organization.slug, 'bypass-org'),
    })
    assert.isUndefined(organization)
  })

  test('adapter maps active organization from the persisted session row', async ({ assert }) => {
    const signUpRes = await postAuth(context.betterAuth, '/api/auth/sign-up/email', {
      email: 'tenant-session@example.com',
      name: 'Tenant Session',
      password: 'SecureP@ss123',
    })
    const signedUp = await assertOkJson<{ user: { id: string } }>(signUpRes)
    const userId = signedUp.user.id

    const sessionRow = await context.db.query.session.findFirst({
      where: eq(schema.session.userId, userId),
    })
    assert.isNotNull(sessionRow)

    const organizationId = uuidv7()
    await context.db.insert(schema.organization).values({
      id: organizationId,
      name: 'Tenant Session Workspace',
      slug: `tenant-session-${organizationId}`,
    })
    await context.db.insert(schema.member).values({
      id: uuidv7(),
      organizationId,
      role: 'owner',
      userId,
    })
    await context.db
      .update(schema.session)
      .set({ activeOrganizationId: organizationId })
      .where(eq(schema.session.id, sessionRow!.id))

    const viaAdapter = await context.authAdapter.getSession(sessionRow!.token)

    assert.isNotNull(viaAdapter)
    assert.equal(viaAdapter!.session.activeOrganizationId, organizationId)
  })
})
