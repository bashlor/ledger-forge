import { AuthenticationError, InvalidCredentialsError } from '#core/user_management/domain/errors'
import { test } from '@japa/runner'

import { presentAuthError } from './auth_error_presenter.js'

function createContext() {
  const flashes: Array<{ key: string; value: unknown }> = []
  let flashAllCount = 0
  let redirectedTo: string | undefined

  return {
    ctx: {
      request: {
        url() {
          return '/signin'
        },
      },
      response: {
        redirect() {
          return {
            toPath(path: string) {
              redirectedTo = path
              return path
            },
          }
        },
      },
      session: {
        flash(key: string, value: unknown) {
          flashes.push({ key, value })
        },
        flashAll() {
          flashAllCount += 1
        },
      },
    },
    flashes,
    getFlashAllCount: () => flashAllCount,
    getRedirectedTo: () => redirectedTo,
  }
}

test.group('presentAuthError', () => {
  test('flashes the notification and mapped input errors, then redirects back', ({ assert }) => {
    const { ctx, flashes, getFlashAllCount, getRedirectedTo } = createContext()

    const result = presentAuthError(ctx as never, new InvalidCredentialsError(), 'E_SIGNIN_ERROR')

    assert.equal(getFlashAllCount(), 1)
    assert.equal(getRedirectedTo(), '/signin')
    assert.equal(result, '/signin')
    assert.deepEqual(flashes, [
      {
        key: 'notification',
        value: { message: 'Invalid email or password.', type: 'error' },
      },
      {
        key: 'inputErrorsBag',
        value: { password: 'Invalid email or password.' },
      },
    ])
  })

  test('sanitizes generic authentication failures before flashing them', ({ assert }) => {
    const { ctx, flashes } = createContext()

    presentAuthError(
      ctx as never,
      new AuthenticationError('Leaky internal detail'),
      'E_UPDATE_PROFILE'
    )

    assert.deepEqual(flashes, [
      {
        key: 'notification',
        value: {
          message: 'An unexpected authentication error occurred. Please try again.',
          type: 'error',
        },
      },
      {
        key: 'inputErrorsBag',
        value: { name: 'An unexpected authentication error occurred. Please try again.' },
      },
    ])
  })
})
