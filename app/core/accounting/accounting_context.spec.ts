import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import {
  accountingAccessFromSession,
  SystemAccountingBusinessCalendar,
} from './accounting_context.js'

test.group('Accounting context support', () => {
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
    })
  })

  test('uses the configured business timezone for calendar dates', ({ assert }) => {
    const calendar = new SystemAccountingBusinessCalendar(
      'Europe/Paris',
      () => DateTime.fromISO('2026-04-01T23:30:00.000Z') as DateTime<true>
    )

    assert.equal(calendar.today(), '2026-04-02')
    assert.equal(calendar.dateFromTimestamp(new Date('2026-04-01T23:30:00.000Z')), '2026-04-02')
  })
})
