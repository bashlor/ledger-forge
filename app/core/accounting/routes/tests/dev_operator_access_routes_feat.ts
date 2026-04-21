import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import * as schema from '#core/common/drizzle/index'
import { AuthorizationService } from '#core/user_management/application/authorization_service'
import { DevToolsEnvironmentService } from '#core/user_management/application/dev_tools_environment_service'
import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'
import { eq } from 'drizzle-orm'

import { setupTestDatabaseForGroup } from '../../../../../tests/helpers/testcontainers_db.js'
import { inertiaHeaders } from './invoices_test_support.js'

test.group('Dev operator access routes', (group) => {
  let cleanup: () => Promise<void>
  let db: PostgresJsDatabase<typeof schema>

  group.setup(async () => {
    const ctx = await setupTestDatabaseForGroup()
    cleanup = ctx.cleanup
    db = await app.container.make('drizzle')
  })

  group.each.setup(async () => {
    app.container.swap(AuthorizationService, async () => {
      return new AuthorizationService(db, [], true)
    })

    app.container.swap(DevToolsEnvironmentService, async () => {
      return new DevToolsEnvironmentService(true)
    })

    await db.delete(schema.devOperatorAccess)
    await db.delete(schema.member)
    await db.delete(schema.session)
    await db.delete(schema.organization)
    await db.delete(schema.user)
  })

  group.each.teardown(() => {
    app.container.restore(AuthorizationService)
    app.container.restore(DevToolsEnvironmentService)
  })

  group.teardown(async () => cleanup())

  test('GET /_dev/access renders the local bootstrap page when dev tools are enabled', async ({
    assert,
    client,
  }) => {
    const response = await inertiaHeaders(client.get('/_dev/access')).redirects(0)

    response.assertStatus(200)
    assert.equal(response.body().component, 'dev/access')
    assert.equal(response.body().props.bootstrap.defaults.email, 'dev-operator@example.local')
  })

  test('POST /_dev/access provisions a dev operator and opens the inspector', async ({
    assert,
    client,
  }) => {
    const response = await client.post('/_dev/access').redirects(0).form({
      email: 'local-dev@example.local',
      fullName: 'Local Dev Operator',
      password: 'SecureP@ss123',
      passwordConfirmation: 'SecureP@ss123',
    })

    response.assertStatus(302)
    response.assertHeader('location', '/_dev/inspector')

    const [user] = await db
      .select({ email: schema.user.email, id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.email, 'local-dev@example.local'))
      .limit(1)

    assert.exists(user)
    const [grant] = await db
      .select({ userId: schema.devOperatorAccess.userId })
      .from(schema.devOperatorAccess)
      .where(eq(schema.devOperatorAccess.userId, user!.id))
      .limit(1)

    assert.equal(grant?.userId, user?.id)

    const cookieHeader = cookieHeaderFromRouteResponse(response.headers()['set-cookie'])
    const inspectorResponse = await inertiaHeaders(client.get('/_dev/inspector'))
      .header('cookie', cookieHeader)
      .redirects(0)

    inspectorResponse.assertStatus(200)
    assert.equal(inspectorResponse.body().component, 'dev/inspector')
  })
})

function cookieHeaderFromRouteResponse(value: null | string | string[] | undefined): string {
  const list = Array.isArray(value) ? value : value ? [value] : []
  return list
    .map((cookie) => cookie.split(';')[0]?.trim())
    .filter(Boolean)
    .join('; ')
}
