import type { HttpContext } from '@adonisjs/core/http'

import {
  inlineNotificationPublicError,
  type PublicErrorOptions,
  type ResolvedPublicError,
  resolvePublicError,
} from '#core/common/errors/public_error'

interface PresentResolvedPublicErrorOptions {
  flashAll?: boolean
  redirectTo?: string
}

export function flashInertiaInputErrors(ctx: HttpContext, bag: Record<string, string>): void {
  if (Object.keys(bag).length === 0) {
    return
  }

  ctx.session.flash('inputErrorsBag', bag)
}

export function flashResolvedPublicError(ctx: HttpContext, resolved: ResolvedPublicError): void {
  flashInertiaInputErrors(ctx, resolved.fieldBag ?? {})
  ctx.session.flash('notification', {
    message: resolved.message,
    type: 'error',
  })
}

export function presentPublicError(
  ctx: HttpContext,
  error: unknown,
  options?: Pick<PublicErrorOptions, 'errorKey'> & PresentResolvedPublicErrorOptions
) {
  const resolved = resolvePublicError(error, options)
  return presentResolvedPublicError(ctx, resolved, options)
}

export function presentPublicMessage(
  ctx: HttpContext,
  message: string,
  options?: PresentResolvedPublicErrorOptions
) {
  return presentResolvedPublicError(ctx, inlineNotificationPublicError(message), options)
}

function presentResolvedPublicError(
  ctx: HttpContext,
  resolved: ResolvedPublicError,
  options?: PresentResolvedPublicErrorOptions
) {
  if (options?.flashAll) {
    ctx.session.flashAll()
  }

  flashResolvedPublicError(ctx, resolved)

  return ctx.response.redirect().toPath(options?.redirectTo ?? ctx.request.url())
}
