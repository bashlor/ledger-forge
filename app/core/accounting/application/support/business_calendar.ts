import env from '#start/env'
import { DateTime } from 'luxon'

export interface AccountingBusinessCalendar {
  dateFromTimestamp(value: Date): string
  today(): string
}

export class SystemAccountingBusinessCalendar implements AccountingBusinessCalendar {
  constructor(
    private readonly timezone = env.get('TZ') ?? 'UTC',
    private readonly now = () => DateTime.now()
  ) {}

  dateFromTimestamp(value: Date): string {
    const isoDate = DateTime.fromJSDate(value).setZone(this.timezone).toISODate()

    if (!isoDate) {
      throw new Error('Could not convert timestamp to business date.')
    }

    return isoDate
  }

  today(): string {
    const isoDate = this.now().setZone(this.timezone).toISODate()

    if (!isoDate) {
      throw new Error('Could not resolve business date.')
    }

    return isoDate
  }
}
