import {
  getDefaultStructuredLogFields,
  type StructuredLogLevel,
  toIsoTimestamp,
  toRequestId,
} from '#core/common/logging/structured_log'
import appLogger from '@adonisjs/core/services/logger'

export interface AccountingActivityEvent {
  actorId?: null | string
  boundedContext?: 'accounting'
  context?: 'Accounting'
  entityId?: string
  entityType?: string
  event?: string
  isAnonymous: boolean
  level?: StructuredLogLevel
  metadata?: Record<string, unknown>
  operation: string
  outcome: 'failure' | 'success'
  requestId?: string
  resourceId?: string
  resourceType: 'customer' | 'dashboard' | 'expense' | 'invoice'
  tenantId?: null | string
  timestamp?: string
  userId?: null | string
}

export interface AccountingActivitySink {
  record(event: AccountingActivityEvent): Promise<void> | void
}

export interface AccountingLoggerLike {
  debug?(bindings: Record<string, unknown>, message: string): void
  error?(bindings: Record<string, unknown>, message: string): void
  fatal?(bindings: Record<string, unknown>, message: string): void
  info(bindings: Record<string, unknown>, message: string): void
  trace?(bindings: Record<string, unknown>, message: string): void
  warn?(bindings: Record<string, unknown>, message: string): void
}

export class StructuredAccountingActivitySink implements AccountingActivitySink {
  constructor(
    private readonly logger: AccountingLoggerLike = appLogger,
    private readonly baseFields: Record<string, unknown> = {}
  ) {}

  record(event: AccountingActivityEvent): void {
    const level: StructuredLogLevel = event.level ?? (event.outcome === 'failure' ? 'warn' : 'info')
    const defaults = getDefaultStructuredLogFields()
    const entityId = event.entityId || event.resourceId || 'unknown'
    const entityType = event.entityType || event.resourceType || 'unknown'
    const userId = event.userId ?? event.actorId ?? defaults.userId ?? null
    const requestId = toRequestId(event.requestId ?? defaults.requestId)
    const tenantId = event.tenantId ?? defaults.tenantId ?? null
    const timestamp = event.timestamp || toIsoTimestamp()

    const bindings = {
      ...this.baseFields,
      ...event,
      actorId: userId,
      boundedContext: 'accounting',
      context: event.context ?? defaults.context ?? 'Accounting',
      entityId,
      entityType,
      event: event.event || event.operation || 'accounting.activity',
      level,
      operation: event.operation || event.event,
      requestId,
      resourceId: entityId,
      resourceType: event.resourceType,
      tenantId,
      timestamp,
      userId,
    }
    const message = `Accounting ${(event.event || event.operation) ?? 'activity'} ${event.outcome}`
    const loggerMethod =
      this.logger[level] ??
      (level === 'warn' || level === 'error' || level === 'fatal'
        ? this.logger.info
        : this.logger.info)

    loggerMethod.call(this.logger, bindings, message)
  }
}
