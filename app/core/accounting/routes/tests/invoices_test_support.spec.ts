import { SystemAccountingBusinessCalendar } from '#core/accounting/application/support/business_calendar'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import {
  createBusinessDateFactory,
  dateOffsetFromBusinessToday,
  resolveBusinessToday,
} from './invoices_test_support.js'

test.group('Invoice test support', () => {
  test('dateOffsetFromBusinessToday follows the business timezone boundary', ({ assert }) => {
    const now = () => DateTime.fromISO('2026-04-01T23:30:00.000Z') as DateTime<true>
    const calendar = new SystemAccountingBusinessCalendar('Europe/Paris', now)

    assert.equal(
      resolveBusinessToday({
        now,
        timezone: 'Europe/Paris',
      }),
      calendar.today()
    )
    assert.equal(
      dateOffsetFromBusinessToday(1, {
        now,
        timezone: 'Europe/Paris',
      }),
      '2026-04-03'
    )
  })

  test('createBusinessDateFactory reuses one captured business today across offsets', ({
    assert,
  }) => {
    const values = [
      DateTime.fromISO('2026-04-01T23:59:59.000Z'),
      DateTime.fromISO('2026-04-02T00:00:01.000Z'),
    ]
    let callCount = 0
    const now = () => {
      const value = values[Math.min(callCount, values.length - 1)]
      callCount += 1
      return value as DateTime<true>
    }

    const businessDates = createBusinessDateFactory({
      now,
      timezone: 'UTC',
    })

    assert.equal(businessDates.today(), '2026-04-01')
    assert.equal(businessDates.offset(30), '2026-05-01')
    assert.equal(callCount, 1)
  })
})
