import {
  getDefaultStructuredLogFields,
  type MinimalStructuredLogEvent,
  type StructuredLogLevel,
  toIsoTimestamp,
  toRequestId,
} from '#core/common/logging/structured_log'
import appLogger from '@adonisjs/core/services/logger'

export interface UserManagementActivityEvent extends Omit<
  MinimalStructuredLogEvent,
  'context' | 'level'
> {
  context: 'UserManagement'
  level?: StructuredLogLevel
  metadata?: Record<string, unknown>
  outcome: 'failure' | 'success'
}

export interface UserManagementActivitySink {
  record(event: UserManagementActivityEvent): Promise<void> | void
}

interface UserManagementLoggerLike {
  debug?(bindings: Record<string, unknown>, message: string): void
  error?(bindings: Record<string, unknown>, message: string): void
  fatal?(bindings: Record<string, unknown>, message: string): void
  info(bindings: Record<string, unknown>, message: string): void
  trace?(bindings: Record<string, unknown>, message: string): void
  warn?(bindings: Record<string, unknown>, message: string): void
}

export class StructuredUserManagementActivitySink implements UserManagementActivitySink {
  constructor(
    private readonly logger: UserManagementLoggerLike = appLogger,
    private readonly baseFields: Record<string, unknown> = {}
  ) {}

  record(event: UserManagementActivityEvent): void {
    const level: StructuredLogLevel = event.level ?? (event.outcome === 'failure' ? 'warn' : 'info')
    const defaults = getDefaultStructuredLogFields()
    const bindings = {
      ...this.baseFields,
      ...event,
      context: event.context ?? defaults.context ?? 'UserManagement',
      level,
      requestId: toRequestId(event.requestId ?? defaults.requestId),
      tenantId: event.tenantId ?? defaults.tenantId ?? null,
      timestamp: event.timestamp || toIsoTimestamp(),
      userId: event.userId ?? defaults.userId ?? null,
    }

    const loggerMethod = this.logger[level] ?? this.logger.info
    loggerMethod.call(this.logger, bindings, `UserManagement ${event.event} ${event.outcome}`)
  }
}
