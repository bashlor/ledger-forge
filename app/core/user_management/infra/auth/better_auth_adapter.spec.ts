import { test } from '@japa/runner'

import type { UserManagementActivityEvent } from '../../support/activity_log.js'

import { BetterAuthAdapter } from './better_auth_adapter.js'

type BetterAuthDrizzle = ConstructorParameters<typeof BetterAuthAdapter>[1]

test.group('BetterAuthAdapter logging behavior', () => {
  test('records missing sessions as warn events', async ({ assert }) => {
    const events: UserManagementActivityEvent[] = []
    const drizzle = {
      query: {
        session: {
          findFirst: async () => null,
        },
        user: {
          findFirst: async () => null,
        },
      },
    } as unknown as BetterAuthDrizzle
    const adapter = new BetterAuthAdapter({} as never, drizzle, {
      record(event) {
        events.push(event)
      },
    })

    const result = await adapter.getSession('missing-token')

    assert.isNull(result)
    assert.lengthOf(events, 1)
    assert.deepInclude(events[0]!, {
      entityId: 'unknown',
      event: 'auth_session_not_found',
      level: 'warn',
      outcome: 'failure',
    })
  })

  test('sanitizes database failure metadata', async ({ assert }) => {
    const events: UserManagementActivityEvent[] = []
    const drizzle = {
      query: {
        session: {
          findFirst: async () => {
            throw new Error('SQL timeout on table session')
          },
        },
        user: {
          findFirst: async () => null,
        },
      },
    } as unknown as BetterAuthDrizzle
    const adapter = new BetterAuthAdapter({} as never, drizzle, {
      record(event) {
        events.push(event)
      },
    })

    const result = await adapter.getSession('broken-token')

    assert.isNull(result)
    assert.lengthOf(events, 1)
    assert.deepInclude(events[0]!, {
      event: 'auth_session_database_error',
      level: 'error',
      outcome: 'failure',
    })
    assert.deepEqual(events[0]!.metadata, {
      errorCode: 'auth_session_database_error',
      errorName: 'Error',
    })
  })

  test('rejects expired sessions after sign-in', async ({ assert }) => {
    const expiredSession = {
      activeOrganizationId: null,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      expiresAt: new Date('2024-01-01T00:00:00.000Z'),
      id: 'session_expired',
      ipAddress: null,
      token: 'expired-token',
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      userAgent: null,
      userId: 'user_expired',
    }
    const user = {
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      email: 'expired@example.com',
      emailVerified: true,
      id: 'user_expired',
      image: null,
      isAnonymous: false,
      name: 'Expired User',
      publicId: 'pub_user_expired',
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    }
    const drizzle = {
      query: {
        session: {
          findFirst: async () => expiredSession,
        },
        user: {
          findFirst: async () => user,
        },
      },
    } as unknown as BetterAuthDrizzle
    const auth = {
      api: {
        signInEmail: async () => ({ token: 'expired-token' }),
      },
    }
    const adapter = new BetterAuthAdapter(auth as never, drizzle)

    await assert.rejects(
      () => adapter.signIn('expired@example.com', 'SecureP@ss123'),
      'Failed to link authentication: Session not found after sign-in'
    )
  })

  test('rejects sign-in responses without a session token', async ({ assert }) => {
    let sessionLookups = 0
    const drizzle = {
      query: {
        session: {
          findFirst: async () => {
            sessionLookups += 1
            return null
          },
        },
        user: {
          findFirst: async () => null,
        },
      },
    } as unknown as BetterAuthDrizzle
    const auth = {
      api: {
        signInEmail: async () => ({}),
      },
    }
    const adapter = new BetterAuthAdapter(auth as never, drizzle)

    await assert.rejects(
      () => adapter.signIn('sam@example.com', 'SecureP@ss123'),
      'Failed to link authentication: No session token returned after sign-in'
    )
    assert.equal(sessionLookups, 0)
  })

  test('prefers the Better Auth get-session endpoint when it returns a full session payload', async ({
    assert,
  }) => {
    const drizzle = {
      query: {
        session: {
          findFirst: async () => {
            throw new Error('database fallback should not be used when get-session succeeds')
          },
        },
        user: {
          findFirst: async () => {
            throw new Error('database fallback should not be used when get-session succeeds')
          },
        },
      },
    } as unknown as BetterAuthDrizzle
    const auth = {
      handler: async () =>
        Response.json({
          session: {
            activeOrganizationId: 'org-handler',
            createdAt: '2024-01-01T00:00:00.000Z',
            expiresAt: '2030-01-01T00:00:00.000Z',
            token: 'handler-token',
            updatedAt: '2024-01-01T00:00:00.000Z',
            userId: 'user_handler',
          },
          user: {
            createdAt: '2024-01-01T00:00:00.000Z',
            email: 'handler@example.com',
            emailVerified: true,
            id: 'user_handler',
            image: null,
            isAnonymous: false,
            name: 'Handler User',
            publicId: 'pub_user_handler',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        }),
    }
    const adapter = new BetterAuthAdapter(auth as never, drizzle)

    const result = await adapter.getSession('handler-token')

    assert.isNotNull(result)
    assert.equal(result!.session.activeOrganizationId, 'org-handler')
    assert.equal(result!.user.publicId, 'pub_user_handler')
  })

  test('falls back to the database when the Better Auth get-session payload is incomplete', async ({
    assert,
  }) => {
    let sessionLookups = 0
    let userLookups = 0
    const session = {
      activeOrganizationId: 'org-db',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
      id: 'session_db',
      ipAddress: null,
      token: 'db-token',
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      userAgent: null,
      userId: 'user_db',
    }
    const user = {
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      email: 'db@example.com',
      emailVerified: true,
      id: 'user_db',
      image: null,
      isAnonymous: false,
      name: 'Database User',
      publicId: 'pub_user_db',
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    }
    const drizzle = {
      query: {
        session: {
          findFirst: async () => {
            sessionLookups += 1
            return session
          },
        },
        user: {
          findFirst: async () => {
            userLookups += 1
            return user
          },
        },
      },
    } as unknown as BetterAuthDrizzle
    const auth = {
      handler: async () =>
        Response.json({
          session: { token: 'db-token' },
          user: { id: 'user_db' },
        }),
    }
    const adapter = new BetterAuthAdapter(auth as never, drizzle)

    const result = await adapter.getSession('db-token')

    assert.isNotNull(result)
    assert.equal(result!.session.activeOrganizationId, 'org-db')
    assert.equal(result!.user.publicId, 'pub_user_db')
    assert.equal(sessionLookups, 1)
    assert.equal(userLookups, 1)
  })
})
