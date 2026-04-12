import type { HttpContext } from '@adonisjs/core/http'

import { HttpProblem } from '#core/common/resources/http_problem'
import app from '@adonisjs/core/services/app'
import router from '@adonisjs/core/services/router'

router
  .any('/api/auth/*', async ({ logger, request, response }: HttpContext) => {
    const auth = await app.container.make('betterAuth')

    const url = new URL(request.url(true), request.completeUrl(true))
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
      logger.error({ err: error }, 'Better Auth handler threw')
      HttpProblem.fromStatus(500, 'An unexpected authentication error occurred.').toResponse(
        response
      )
      return
    }

    if (webResponse.status >= 400) {
      let code: string | undefined
      let detail: string | undefined
      try {
        const body = (await webResponse.json()) as Record<string, unknown>
        code = body?.code as string | undefined
        detail = body?.message as string | undefined
      } catch {}

      for (const cookie of webResponse.headers.getSetCookie()) {
        response.append('Set-Cookie', cookie)
      }
      HttpProblem.fromBetterAuthCode(code, detail).toResponse(response)
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
