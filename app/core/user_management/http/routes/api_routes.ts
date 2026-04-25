import type { HttpContext } from '@adonisjs/core/http'

import { HttpProblem } from '#core/common/resources/http_problem'
import { AuthenticationError } from '#core/user_management/domain/errors'
import {
  recordUserManagementActivityEvent,
  StructuredUserManagementActivitySink,
} from '#core/user_management/support/activity_log'
import app from '@adonisjs/core/services/app'
import router from '@adonisjs/core/services/router'

router
  .any('/api/auth/*', async (ctx: HttpContext) => {
    const { request, response } = ctx
    const auth = await app.container.make('betterAuth')

    const url = new URL(request.url(true), request.completeUrl(true))

    if (url.pathname.startsWith('/api/auth/organization')) {
      recordAuthProxyEvent(ctx, 'better_auth_org_surface_blocked', {
        level: 'warn',
        metadata: { path: url.pathname },
      })
      new HttpProblem(
        403,
        'Forbidden',
        'Organization endpoints are disabled.',
        'urn:accounting-app:error:forbidden',
        undefined,
        { code: 'auth.forbidden' }
      ).toResponse(response)
      return
    }

    const headers = new Headers()
    for (const [key, value] of Object.entries(request.headers())) {
      if (value) {
        if (Array.isArray(value)) value.forEach((v) => headers.append(key, v))
        else headers.set(key, value)
      }
    }

    const method = request.method().toUpperCase()
    const webRequest = new Request(url.toString(), {
      body: method !== 'GET' && method !== 'HEAD' ? JSON.stringify(request.body()) : undefined,
      headers,
      method,
    })

    let webResponse: Response
    try {
      webResponse = await auth.handler(webRequest)
    } catch (error) {
      recordAuthProxyEvent(ctx, 'better_auth_handler_error', {
        level: 'error',
        metadata: {
          errorName: error instanceof Error ? error.name : 'UnknownError',
        },
      })
      HttpProblem.fromError(new AuthenticationError()).toResponse(response)
      return
    }

    if (webResponse.status >= 400) {
      let code: string | undefined
      try {
        const body = (await webResponse.json()) as Record<string, unknown>
        code = body?.code as string | undefined
      } catch (error) {
        recordAuthProxyEvent(ctx, 'better_auth_error_payload_unparseable', {
          level: 'warn',
          metadata: {
            errorName: error instanceof Error ? error.name : 'UnknownError',
          },
        })
      }

      for (const cookie of webResponse.headers.getSetCookie()) {
        response.append('Set-Cookie', cookie)
      }
      HttpProblem.fromBetterAuthCode(code).toResponse(response)
      return
    }

    response.status(webResponse.status)
    for (const cookie of webResponse.headers.getSetCookie()) {
      response.append('Set-Cookie', cookie)
    }
    webResponse.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'set-cookie') response.header(key, value)
    })
    const body = await webResponse.text()
    if (body) response.send(body)
  })
  .as('better-auth.handler')

function recordAuthProxyEvent(
  ctx: HttpContext,
  event: string,
  options: {
    level: 'error' | 'warn'
    metadata?: Record<string, unknown>
  }
): void {
  recordUserManagementActivityEvent(
    {
      entityId: 'authentication',
      entityType: 'auth',
      event,
      level: options.level,
      metadata: options.metadata,
      outcome: 'failure',
      tenantId: ctx.authSession?.session.activeOrganizationId ?? null,
      userId: ctx.authSession?.user.id ?? null,
    },
    new StructuredUserManagementActivitySink(ctx.logger)
  )
}
