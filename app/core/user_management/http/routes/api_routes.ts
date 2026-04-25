import type { HttpContext } from '@adonisjs/core/http'

import { HttpProblem } from '#core/common/resources/http_problem'
import { AuthenticationError } from '#core/user_management/domain/errors'
import {
  recordUserManagementActivityEvent,
  StructuredUserManagementActivitySink,
} from '#core/user_management/support/activity_log'
import app from '@adonisjs/core/services/app'
import router from '@adonisjs/core/services/router'

const BETTER_AUTH_ROUTES = [
  { method: 'get', name: 'better-auth.ok', path: '/api/auth/ok' },
  { method: 'post', name: 'better-auth.sign-in.email', path: '/api/auth/sign-in/email' },
  { method: 'post', name: 'better-auth.sign-up.email', path: '/api/auth/sign-up/email' },
  { method: 'post', name: 'better-auth.sign-in.anonymous', path: '/api/auth/sign-in/anonymous' },
  { method: 'post', name: 'better-auth.sign-out', path: '/api/auth/sign-out' },
  { method: 'post', name: 'better-auth.change-password', path: '/api/auth/change-password' },
  { method: 'post', name: 'better-auth.forget-password', path: '/api/auth/forget-password' },
  { method: 'post', name: 'better-auth.reset-password', path: '/api/auth/reset-password' },
  { method: 'get', name: 'better-auth.verify-email', path: '/api/auth/verify-email' },
] as const

for (const route of BETTER_AUTH_ROUTES) {
  router[route.method](route.path, proxyBetterAuthRequest).as(route.name)
}

router
  .post('/api/auth/organization/create', (ctx: HttpContext) => rejectOrganizationSurface(ctx))
  .as('better-auth.organization.create.blocked')

function appendSetCookieHeaders(response: HttpContext['response'], webResponse: Response): void {
  for (const cookie of webResponse.headers.getSetCookie()) {
    response.append('Set-Cookie', cookie)
  }
}

function createWebRequest(ctx: HttpContext): Request {
  const { request } = ctx
  const headers = new Headers()
  for (const [key, value] of Object.entries(request.headers())) {
    if (value) {
      if (Array.isArray(value)) value.forEach((v) => headers.append(key, v))
      else headers.set(key, value)
    }
  }

  const method = request.method().toUpperCase()
  return new Request(new URL(request.url(true), request.completeUrl(true)).toString(), {
    body: method !== 'GET' && method !== 'HEAD' ? JSON.stringify(request.body()) : undefined,
    headers,
    method,
  })
}

async function proxyBetterAuthRequest(ctx: HttpContext): Promise<void> {
  const { response } = ctx
  const auth = await app.container.make('betterAuth')
  const webRequest = createWebRequest(ctx)

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

    appendSetCookieHeaders(response, webResponse)
    HttpProblem.fromBetterAuthCode(code).toResponse(response)
    return
  }

  response.status(webResponse.status)
  appendSetCookieHeaders(response, webResponse)
  webResponse.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'set-cookie') response.header(key, value)
  })
  const body = await webResponse.text()
  if (body) response.send(body)
}

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

function rejectOrganizationSurface(ctx: HttpContext): void {
  recordAuthProxyEvent(ctx, 'better_auth_org_surface_blocked', {
    level: 'warn',
    metadata: { path: new URL(ctx.request.url(true), ctx.request.completeUrl(true)).pathname },
  })
  new HttpProblem(
    403,
    'Forbidden',
    'Organization endpoints are disabled.',
    'urn:accounting-app:error:forbidden',
    undefined,
    { code: 'auth.forbidden' }
  ).toResponse(ctx.response)
}
