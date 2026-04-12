import * as schema from '#core/common/drizzle/index'
import { test } from '@japa/runner'
import { eq } from 'drizzle-orm'

import {
  bindTestServices,
  createTestPostgresContext,
} from '../../../../../../tests/helpers/test_postgres.js'

test.group('Better Auth integration', (group) => {
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

  test('persists users and sessions through Better Auth', async ({ assert }) => {
    const result = await context.betterAuth.api.signUpEmail({
      body: {
        email: 'integration@example.com',
        name: 'Integration User',
        password: 'SecureP@ss123',
      },
    })

    assert.isDefined(result.token)

    const user = await context.db.query.user.findFirst({
      where: eq(schema.user.id, result.user.id),
    })
    const session = await context.db.query.session.findFirst({
      where: eq(schema.session.token, result.token!),
    })

    assert.isNotNull(user)
    assert.equal(user!.email, 'integration@example.com')
    assert.isNotNull(session)
    assert.equal(session!.userId, result.user.id)
  })

  test('reads users through the auth adapter', async ({ assert }) => {
    const signedUp = await context.authAdapter.signUp(
      'session@example.com',
      'SecureP@ss123',
      'Session User'
    )

    const storedUser = await context.authAdapter.getUserById(signedUp.user.id)
    const storedSession = await context.db.query.session.findFirst({
      where: eq(schema.session.token, signedUp.session.token),
    })

    assert.isNotNull(storedUser)
    assert.equal(storedUser!.email, 'session@example.com')
    assert.isNotNull(storedSession)
    assert.equal(storedSession!.userId, signedUp.user.id)
  })
})
