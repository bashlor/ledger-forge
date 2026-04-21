import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import { resolveHttpErrorStatus } from '#core/common/errors/domain_error_status'
import { getRequestIdFromHttpContext } from '#core/common/logging/request_id'
import {
  runWithRequestStructuredLogContext,
  updateRequestStructuredLogContext,
} from '#core/common/logging/request_log_context'
import { toIsoTimestamp } from '#core/common/logging/structured_log'

export default class StructuredRequestLoggingMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const startedAt = Date.now()
    const requestId = getRequestIdFromHttpContext(ctx)
    const context = resolveLogContext(ctx)
    const entityId = resolveEntityId(ctx)
    const tenantId = resolveTenantIdFromAuthSession(ctx)

    return runWithRequestStructuredLogContext(
      {
        context,
        requestId,
        tenantId,
        userId: ctx.authSession?.user.id ?? null,
      },
      async () => {
        ctx.logger.info(
          {
            context,
            entityId,
            entityType: 'http_request',
            event: 'request_received',
            level: 'info',
            method: ctx.request.method().toUpperCase(),
            path: ctx.request.url(),
            requestId,
            tenantId,
            timestamp: toIsoTimestamp(),
            userId: ctx.authSession?.user.id ?? null,
          },
          `${context} request received`
        )

        try {
          await next()

          const status = ctx.response.getStatus()
          const level = resolveLevel(status)
          const userId = ctx.authSession?.user.id ?? null
          updateRequestStructuredLogContext({
            tenantId: resolveTenantIdFromAuthSession(ctx),
            userId,
          })

          ctx.logger[level](
            {
              context,
              durationMs: Date.now() - startedAt,
              entityId,
              entityType: 'http_request',
              event: 'request_completed',
              level,
              method: ctx.request.method().toUpperCase(),
              path: ctx.request.url(),
              requestId,
              status,
              tenantId: resolveTenantIdFromAuthSession(ctx),
              timestamp: toIsoTimestamp(),
              userId,
            },
            `${context} request completed`
          )
        } catch (error) {
          const userId = ctx.authSession?.user.id ?? null
          updateRequestStructuredLogContext({
            tenantId: resolveTenantIdFromAuthSession(ctx),
            userId,
          })

          ctx.logger.error(
            {
              context,
              durationMs: Date.now() - startedAt,
              entityId,
              entityType: 'http_request',
              errorName: error instanceof Error ? error.name : 'UnknownError',
              event: 'request_failed',
              level: 'error',
              method: ctx.request.method().toUpperCase(),
              path: ctx.request.url(),
              requestId,
              status: resolveHttpErrorStatus(error),
              tenantId: resolveTenantIdFromAuthSession(ctx),
              timestamp: toIsoTimestamp(),
              userId,
            },
            `${context} request failed`
          )

          throw error
        }
      }
    )
  }
}

function resolveEntityId(ctx: HttpContext): string {
  const routeName = (ctx.route as undefined | { name?: string })?.name
  return routeName ?? `${ctx.request.method().toUpperCase()} ${ctx.request.url()}`
}

function resolveLevel(status: number): 'error' | 'info' | 'warn' {
  if (status >= 500) return 'error'
  if (status >= 300) return 'warn'
  return 'info'
}

function resolveLogContext(ctx: HttpContext): 'Accounting' | 'UserManagement' {
  const routeName = (ctx.route as undefined | { name?: string })?.name
  const path = ctx.request.url()

  if (
    path.startsWith('/api/auth') ||
    path.startsWith('/signin') ||
    path.startsWith('/signup') ||
    path.startsWith('/forgot-password') ||
    path.startsWith('/reset-password') ||
    path.startsWith('/account') ||
    path.startsWith('/signout') ||
    routeName?.startsWith('signin.') ||
    routeName?.startsWith('signup.') ||
    routeName?.startsWith('forgot_password.') ||
    routeName?.startsWith('reset_password.') ||
    routeName?.startsWith('account.') ||
    routeName?.startsWith('signout.')
  ) {
    return 'UserManagement'
  }

  return 'Accounting'
}

function resolveTenantIdFromAuthSession(ctx: HttpContext): null | string {
  return ctx.authSession?.session.activeOrganizationId ?? null
}
