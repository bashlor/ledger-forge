import appLogger from '@adonisjs/core/services/logger'

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

export interface AccountingLoggerLike {
  info(bindings: Record<string, unknown>, message: string): void
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
