import type { HttpContext } from '@adonisjs/core/http'

import { toRequestId } from './structured_log.js'

type RequestLike = {
  header?: (name: string) => null | string
  id?: (() => unknown) | unknown
  requestId?: unknown
}

export function getRequestIdFromHttpContext(ctx: HttpContext): string {
  const request = ctx.request as unknown as RequestLike

  if (typeof request.id === 'function') {
    return toRequestId(request.id())
  }
  if (request.id !== undefined) {
    return toRequestId(request.id)
  }
  if (request.requestId !== undefined) {
    return toRequestId(request.requestId)
  }
  if (request.header) {
    return toRequestId(request.header('x-request-id'))
  }

  return 'unknown'
}
