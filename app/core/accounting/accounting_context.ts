import type { AuthResult } from '#core/user_management/domain/authentication'

import env from '#start/env'
import appLogger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'

export interface AccountingAccessContext {
  actorId: null | string
  isAnonymous: boolean
}

export interface AccountingActivityEvent {
  actorId: null | string
  boundedContext: 'accounting'
  isAnonymous: boolean
  metadata?: Record<string, unknown>
  operation: string
  outcome: 'failure' | 'success'
  resourceId?: string
  resourceType: 'customer' | 'dashboard' | 'expense' | 'invoice'
}

export interface AccountingActivitySink {
  record(event: AccountingActivityEvent): Promise<void> | void
}

export interface AccountingBusinessCalendar {
  dateFromTimestamp(value: Date): string
  today(): string
}

export interface AccountingLoggerLike {
  info(bindings: Record<string, unknown>, message: string): void
}

export interface AccountingServiceDependencies {
  activitySink?: AccountingActivitySink
  businessCalendar?: AccountingBusinessCalendar
}

export const SYSTEM_ACCOUNTING_ACCESS_CONTEXT: AccountingAccessContext = {
  actorId: null,
  isAnonymous: false,
}

export class StructuredAccountingActivitySink implements AccountingActivitySink {
  constructor(
    private readonly logger: AccountingLoggerLike = appLogger,
    private readonly baseFields: Record<string, unknown> = {}
  ) {}

  record(event: AccountingActivityEvent): void {
    this.logger.info(
      {
        ...this.baseFields,
        ...event,
      },
      `Accounting ${event.operation} ${event.outcome}`
    )
  }
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

export function accountingAccessFromSession(session?: AuthResult): AccountingAccessContext {
  if (!session) {
    return SYSTEM_ACCOUNTING_ACCESS_CONTEXT
  }

  return {
    actorId: session.user.id,
    isAnonymous: session.user.isAnonymous,
  }
}
