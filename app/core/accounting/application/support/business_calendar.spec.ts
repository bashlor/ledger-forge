import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { SystemAccountingBusinessCalendar } from './business_calendar.js'

test.group('Accounting business calendar', () => {
  test('uses the configured business timezone for calendar dates', ({ assert }) => {
    const calendar = new SystemAccountingBusinessCalendar(
      'Europe/Paris',
      () => DateTime.fromISO('2026-04-01T23:30:00.000Z') as DateTime<true>
    )

    assert.equal(calendar.today(), '2026-04-02')
    assert.equal(calendar.dateFromTimestamp(new Date('2026-04-01T23:30:00.000Z')), '2026-04-02')
  })
})
