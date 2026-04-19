import type { HttpContext } from '@adonisjs/core/http'

import { getRequestIdFromHttpContext } from '#core/common/logging/request_id'
import { toIsoTimestamp } from '#core/common/logging/structured_log'

import {
  StructuredUserManagementActivitySink,
  type UserManagementActivityEvent,
} from '../../support/activity_log.js'

type HttpLoggerLike = {
  debug(bindings: Record<string, unknown>, message: string): void
  error(bindings: Record<string, unknown>, message: string): void
  fatal(bindings: Record<string, unknown>, message: string): void
  info(bindings: Record<string, unknown>, message: string): void
  trace(bindings: Record<string, unknown>, message: string): void
  warn(bindings: Record<string, unknown>, message: string): void
}

type UserManagementHttpEventInput = Omit<
  UserManagementActivityEvent,
  'context' | 'requestId' | 'timestamp' | 'userId'
> & { userId?: null | string }

type UserManagementHttpLogBindings = Omit<
  UserManagementHttpEventInput,
  'entityId' | 'entityType' | 'event' | 'level' | 'metadata' | 'outcome'
> & {
  entityId?: string
  entityType?: string
  level?: 'debug' | 'error' | 'fatal' | 'info' | 'trace' | 'warn'
  metadata?: Record<string, unknown>
}

type UserManagementHttpLogger = ReturnType<typeof userManagementHttpLogger>

type UserManagementHttpLogResolver<T> = (
  value: T
) => UserManagementHttpLogBindings & { event: string }

export function recordUserManagementHttpEvent(
  ctx: HttpContext,
  event: UserManagementHttpEventInput
): void {
  const sink = new StructuredUserManagementActivitySink(ctx.logger as unknown as HttpLoggerLike)
  sink.record({
    ...event,
    context: 'UserManagement',
    requestId: getRequestIdFromHttpContext(ctx),
    timestamp: toIsoTimestamp(),
    userId: event.userId ?? ctx.authSession?.user.id ?? null,
  })
}

export function userManagementHttpLogger(
  ctx: HttpContext,
  defaults: Partial<UserManagementHttpLogBindings> = {}
) {
  const withDefaults = (
    event: string,
    outcome: 'failure' | 'success',
    level: 'debug' | 'error' | 'fatal' | 'info' | 'trace' | 'warn',
    bindings: UserManagementHttpLogBindings = {}
  ) => {
    recordUserManagementHttpEvent(ctx, {
      ...defaults,
      ...bindings,
      entityId: bindings.entityId ?? defaults.entityId ?? 'unknown',
      entityType: bindings.entityType ?? defaults.entityType ?? 'unknown',
      event,
      level,
      metadata: mergeMetadata(defaults.metadata, bindings.metadata),
      outcome,
    })
  }

  return {
    error(event: string, bindings: UserManagementHttpLogBindings = {}) {
      withDefaults(event, 'failure', 'error', bindings)
    },
    failure(event: string, error: unknown, bindings: UserManagementHttpLogBindings = {}) {
      withDefaults(event, 'failure', bindings.level ?? 'warn', {
        ...bindings,
        metadata: mergeMetadata(bindings.metadata, toErrorMetadata(error)),
      })
    },
    info(event: string, bindings: UserManagementHttpLogBindings = {}) {
      withDefaults(event, 'success', 'info', bindings)
    },
    run<T>(
      action: () => Promise<T>,
      options: {
        failure:
          | (UserManagementHttpLogBindings & { event: string })
          | UserManagementHttpLogResolver<unknown>
        success:
          | (UserManagementHttpLogBindings & { event: string })
          | UserManagementHttpLogResolver<T>
      }
    ): Promise<T> {
      return runUserManagementHttpLogAction(this, action, options)
    },
    success(event: string, bindings: UserManagementHttpLogBindings = {}) {
      withDefaults(event, 'success', bindings.level ?? 'info', bindings)
    },
    warn(event: string, bindings: UserManagementHttpLogBindings = {}) {
      withDefaults(event, 'failure', 'warn', bindings)
    },
  }
}

function mergeMetadata(
  defaults?: Record<string, unknown>,
  metadata?: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!defaults && !metadata) return undefined
  return { ...defaults, ...metadata }
}

function resolveBindings<T>(
  resolver: (UserManagementHttpLogBindings & { event: string }) | UserManagementHttpLogResolver<T>,
  value: T
): UserManagementHttpLogBindings & { event: string } {
  return typeof resolver === 'function' ? resolver(value) : resolver
}

async function runUserManagementHttpLogAction<T>(
  logger: Pick<UserManagementHttpLogger, 'failure' | 'success'>,
  action: () => Promise<T>,
  options: {
    failure:
      | (UserManagementHttpLogBindings & { event: string })
      | UserManagementHttpLogResolver<unknown>
    success: (UserManagementHttpLogBindings & { event: string }) | UserManagementHttpLogResolver<T>
  }
): Promise<T> {
  try {
    const result = await action()
    const success = resolveBindings(options.success, result)
    logger.success(success.event, success)
    return result
  } catch (error) {
    const failure = resolveBindings(options.failure, error)
    logger.failure(failure.event, error, failure)
    throw error
  }
}

function toErrorMetadata(error: unknown): Record<string, unknown> | undefined {
  if (!(error instanceof Error)) {
    return undefined
  }

  return { errorName: error.name }
}
