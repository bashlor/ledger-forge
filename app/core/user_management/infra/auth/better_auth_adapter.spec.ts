import { test } from '@japa/runner'

import type { UserManagementActivityEvent } from '../../support/activity_log.js'

import { BetterAuthAdapter } from './better_auth_adapter.js'

test.group('BetterAuthAdapter logging behavior', () => {
  test('records missing sessions as warn events', async ({ assert }) => {
    const events: UserManagementActivityEvent[] = []
    const adapter = new BetterAuthAdapter(
      {} as never,
      {
        query: {
          session: {
            findFirst: async () => null,
          },
          user: {
            findFirst: async () => null,
          },
        },
      },
      {
        record(event) {
          events.push(event)
        },
      }
    )

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
    const adapter = new BetterAuthAdapter(
      {} as never,
      {
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
      },
      {
        record(event) {
          events.push(event)
        },
      }
    )

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
})
