import { getRequestStructuredLogContext } from './request_log_context.js'

export type AccountingStructuredLogEvent = LegacyAccountingLogAliases &
  MinimalStructuredLogEvent & {
    isAnonymous: boolean
    metadata?: Record<string, unknown>
    outcome: 'failure' | 'success'
  }

export interface LegacyAccountingLogAliases {
  actorId?: null | string
  boundedContext?: 'accounting'
  operation?: string
  resourceId?: string
  resourceType?: string
}

export interface MinimalStructuredLogEvent {
  context: StructuredLogContext
  entityId: string
  entityType: string
  event: string
  level: StructuredLogLevel
  requestId: string
  tenantId?: null | string
  timestamp: string
  userId?: null | string
}

export type StructuredLogContext = 'Accounting' | 'UserManagement'

export type StructuredLogLevel = 'debug' | 'error' | 'fatal' | 'info' | 'trace' | 'warn'

export function getDefaultStructuredLogFields(): {
  context?: StructuredLogContext
  requestId?: string
  tenantId?: null | string
  userId?: null | string
} {
  const current = getRequestStructuredLogContext()

  return {
    context: current?.context,
    requestId: current?.requestId,
    tenantId: current?.tenantId,
    userId: current?.userId,
  }
}

export function toIsoTimestamp(date = new Date()): string {
  return date.toISOString()
}

export function toRequestId(value: unknown): string {
  return typeof value === 'string' && value.length > 0 ? value : 'unknown'
}
