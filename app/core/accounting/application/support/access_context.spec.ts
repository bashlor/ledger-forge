import { test } from '@japa/runner'

import { accountingAccessFromSession } from './access_context.js'

test.group('Accounting access context', () => {
  test('maps auth session to accounting access context', ({ assert }) => {
    const access = accountingAccessFromSession({
      session: {
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
        token: 'session-token',
        userId: 'user-1',
      },
      user: {
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        email: 'user@example.com',
        emailVerified: true,
        id: 'user-1',
        image: null,
        isAnonymous: true,
        name: 'Anonymous User',
      },
    })

    assert.deepEqual(access, {
      actorId: 'user-1',
      isAnonymous: true,
      requestId: 'unknown',
    })
  })
})
