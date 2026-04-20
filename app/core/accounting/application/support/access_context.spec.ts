import { test } from '@japa/runner'

import { accountingAccessFromSession, systemAccessContext } from './access_context.js'

test.group('Accounting access context', () => {
  test('throws when session has no active organization', ({ assert }) => {
    assert.throws(
      () =>
        accountingAccessFromSession({
          session: {
            activeOrganizationId: null,
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
            publicId: 'pub-user-1',
          },
        }),
      'Missing active organization'
    )
  })

  test('maps active organization id to tenant id', ({ assert }) => {
    const access = accountingAccessFromSession({
      session: {
        activeOrganizationId: 'org-tenant-1',
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
        isAnonymous: false,
        name: 'User',
        publicId: 'pub-user-1',
      },
    })

    assert.equal(access.tenantId, 'org-tenant-1')
  })

  test('throws when session is undefined', ({ assert }) => {
    assert.throws(() => accountingAccessFromSession(undefined), 'Missing active organization')
  })

  test('systemAccessContext builds context with explicit tenant id', ({ assert }) => {
    const access = systemAccessContext('my-org-id')
    assert.deepEqual(access, {
      actorId: null,
      isAnonymous: false,
      requestId: 'system',
      tenantId: 'my-org-id',
    })
  })
})
