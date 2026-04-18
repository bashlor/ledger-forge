import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'

import { AUTH_SESSION_TOKEN_COOKIE_NAME } from '../../auth_session_cookie.js'
import { clearSessionToken, readSessionToken, writeSessionToken } from './session_token.js'

function createContext(cookieHeader?: string) {
  const setCookies: string[] = []

  return {
    ctx: {
      request: {
        header(name: string) {
          return name === 'cookie' ? cookieHeader : undefined
        },
      },
      response: {
        append(name: string, value: string) {
          if (name === 'Set-Cookie') {
            setCookies.push(value)
          }
        },
      },
    },
    setCookies,
  }
}

function withProductionFlag<T>(value: boolean, callback: () => T): T {
  const descriptor = Object.getOwnPropertyDescriptor(app, 'inProduction')

  Object.defineProperty(app, 'inProduction', {
    configurable: true,
    value,
  })

  try {
    return callback()
  } finally {
    if (descriptor) {
      Object.defineProperty(app, 'inProduction', descriptor)
    } else {
      delete (app as unknown as Record<string, unknown>).inProduction
    }
  }
}

test.group('session token helpers', () => {
  test('reads the raw session token from the cookie header', ({ assert }) => {
    const { ctx } = createContext(
      `foo=bar; ${AUTH_SESSION_TOKEN_COOKIE_NAME}=session_token_123; theme=dark`
    )

    assert.equal(readSessionToken(ctx as never), 'session_token_123')
  })

  test('returns null when the session token cookie is missing', ({ assert }) => {
    const { ctx } = createContext('foo=bar; theme=dark')

    assert.isNull(readSessionToken(ctx as never))
  })

  test('writes the raw session token cookie with Max-Age', ({ assert }) => {
    const { ctx, setCookies } = createContext()
    const now = Date.now()

    withProductionFlag(false, () => {
      writeSessionToken(ctx as never, {
        expiresAt: new Date(now + 60_000),
        token: 'raw_test_token',
      })
    })

    assert.lengthOf(setCookies, 1)
    assert.include(setCookies[0], `${AUTH_SESSION_TOKEN_COOKIE_NAME}=raw_test_token`)
    assert.include(setCookies[0], 'Path=/')
    assert.include(setCookies[0], 'HttpOnly')
    assert.include(setCookies[0], 'SameSite=Lax')
    assert.match(setCookies[0], /Max-Age=\d+/)
    assert.notInclude(setCookies[0], '; Secure')
  })

  test('adds Secure to session cookies in production and clears cookies correctly', ({
    assert,
  }) => {
    const written = createContext()
    const cleared = createContext()

    withProductionFlag(true, () => {
      writeSessionToken(written.ctx as never, {
        expiresAt: new Date(Date.now() + 60_000),
        token: 'prod_token',
      })
      clearSessionToken(cleared.ctx as never)
    })

    assert.include(written.setCookies[0], '; Secure')
    assert.include(cleared.setCookies[0], `${AUTH_SESSION_TOKEN_COOKIE_NAME}=;`)
    assert.include(cleared.setCookies[0], 'Expires=Thu, 01 Jan 1970 00:00:00 GMT')
    assert.include(cleared.setCookies[0], '; Secure')
  })
})
