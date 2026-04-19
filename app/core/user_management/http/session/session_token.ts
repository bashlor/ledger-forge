import type { HttpContext } from '@adonisjs/core/http'

import app from '@adonisjs/core/services/app'

import { AUTH_SESSION_TOKEN_COOKIE_NAME } from '../../auth_session_cookie.js'

const COOKIE_NAME = AUTH_SESSION_TOKEN_COOKIE_NAME

export function clearSessionToken(ctx: HttpContext): void {
  ctx.response.append(
    'Set-Cookie',
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT${app.inProduction ? '; Secure' : ''}`
  )
}

export function readSessionToken(ctx: HttpContext): null | string {
  const requestCookie =
    typeof ctx.request.cookie === 'function' ? ctx.request.cookie(COOKIE_NAME) : undefined

  if (typeof requestCookie === 'string' && requestCookie.length > 0) {
    return requestCookie
  }

  const cookieHeader = ctx.request.header('cookie') ?? ''
  return parseCookie(cookieHeader).get(COOKIE_NAME) ?? null
}

export function writeSessionToken(
  ctx: HttpContext,
  payload: {
    expiresAt: Date
    token: string
  }
): void {
  const maxAge = Math.floor((payload.expiresAt.getTime() - Date.now()) / 1000)
  const secure = app.inProduction ? '; Secure' : ''

  // Better Auth expects the raw session token in the browser cookie.
  // Bypass Adonis cookie encoding/encryption and write the header directly.
  ctx.response.append(
    'Set-Cookie',
    `${COOKIE_NAME}=${payload.token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`
  )
}

function parseCookie(cookieHeader: string): Map<string, string> {
  return new Map(
    cookieHeader
      .split(';')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const separatorIndex = entry.indexOf('=')
        if (separatorIndex === -1) {
          return [entry, '']
        }

        return [entry.slice(0, separatorIndex), entry.slice(separatorIndex + 1)]
      })
  )
}
