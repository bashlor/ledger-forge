import { AsyncLocalStorage } from 'node:async_hooks'

import type { StructuredLogContext } from './structured_log.js'

export interface RequestStructuredLogContext {
  context?: StructuredLogContext
  requestId?: string
  tenantId?: null | string
  userId?: null | string
}

const storage = new AsyncLocalStorage<RequestStructuredLogContext>()

export function getRequestStructuredLogContext(): RequestStructuredLogContext | undefined {
  return storage.getStore()
}

export function runWithRequestStructuredLogContext<T>(
  context: RequestStructuredLogContext,
  callback: () => T
): T {
  return storage.run(context, callback)
}

export function updateRequestStructuredLogContext(
  values: Partial<RequestStructuredLogContext>
): RequestStructuredLogContext | undefined {
  const current = storage.getStore()

  if (!current) {
    return undefined
  }

  const next = { ...current, ...values }
  storage.enterWith(next)
  return next
}
