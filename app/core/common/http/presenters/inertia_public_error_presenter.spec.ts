import { DomainError } from '#core/common/errors/domain_error'
import {
  AuthenticationError,
  EmailNotVerifiedError,
  InvalidCredentialsError,
  SessionExpiredError,
  UserAlreadyExistsError,
  UserNotFoundError,
} from '#core/user_management/domain/errors'
import { test } from '@japa/runner'

import {
  flashInertiaInputErrors,
  flashResolvedPublicError,
  presentPublicError,
  presentPublicMessage,
} from './inertia_public_error_presenter.js'

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

test.group('public error presenter', () => {
  test('flashes the bag only when there are actual errors', ({ assert }) => {
    const { ctx, flashes } = createContext()

    flashInertiaInputErrors(ctx as never, {})
    flashInertiaInputErrors(ctx as never, { email: 'Invalid' })

    assert.deepEqual(flashes, [{ key: 'inputErrorsBag', value: { email: 'Invalid' } }])
  })

  test('flashes a resolved public error without remapping it', ({ assert }) => {
    const { ctx, flashes } = createContext()

    flashResolvedPublicError(ctx as never, {
      code: 'auth.invalid_credentials',
      fieldBag: { password: 'Invalid email or password.' },
      message: 'Invalid email or password.',
      presentation: 'form',
      status: 401,
    })

    assert.deepEqual(flashes, [
      {
        key: 'inputErrorsBag',
        value: { password: 'Invalid email or password.' },
      },
      {
        key: 'notification',
        value: { message: 'Invalid email or password.', type: 'error' },
      },
    ])
  })

  test('presents a mapped error through flash and redirect', ({ assert }) => {
    const { ctx, flashes, getFlashAllCount, getRedirectedTo } = createContext()

    const result = presentPublicError(ctx as never, new InvalidCredentialsError(), {
      flashAll: true,
    })

    assert.equal(getFlashAllCount(), 1)
    assert.equal(getRedirectedTo(), '/signin')
    assert.equal(result, '/signin')
    assert.deepEqual(flashes, [
      {
        key: 'inputErrorsBag',
        value: { password: 'Invalid email or password.' },
      },
      {
        key: 'notification',
        value: { message: 'Invalid email or password.', type: 'error' },
      },
    ])
  })

  test('presents a manual public message through the same pipeline', ({ assert }) => {
    const { ctx, flashes, getFlashAllCount, getRedirectedTo } = createContext()

    const result = presentPublicMessage(ctx as never, 'Anonymous accounts cannot do that.', {
      flashAll: true,
      redirectTo: '/account',
    })

    assert.equal(getFlashAllCount(), 1)
    assert.equal(getRedirectedTo(), '/account')
    assert.equal(result, '/account')
    assert.deepEqual(flashes, [
      {
        key: 'notification',
        value: { message: 'Anonymous accounts cannot do that.', type: 'error' },
      },
    ])
  })

  test('maps auth failures through the shared public-error contract', ({ assert }) => {
    const { ctx, flashes } = createContext()
    const invalidPayload = new DomainError(
      'The email address is invalid.',
      'invalid_data',
      'InvalidAuthPayloadError'
    )
    const invalidToken = new DomainError(
      'The link has expired or is invalid.',
      'unauthorized_user_operation',
      'InvalidTokenError'
    )

    presentPublicError(ctx as never, new InvalidCredentialsError())
    presentPublicError(ctx as never, new SessionExpiredError(), { errorKey: 'E_CHANGE_PASSWORD' })
    presentPublicError(ctx as never, new UserAlreadyExistsError(), { errorKey: 'E_SIGNUP_ERROR' })
    presentPublicError(ctx as never, new EmailNotVerifiedError())
    presentPublicError(ctx as never, new UserNotFoundError())
    presentPublicError(ctx as never, invalidPayload)
    presentPublicError(ctx as never, invalidToken, { errorKey: 'E_RESET_PASSWORD' })
    presentPublicError(ctx as never, new AuthenticationError('Leaky internal detail'), {
      errorKey: 'E_UPDATE_PROFILE',
    })

    assert.deepEqual(flashes, [
      {
        key: 'inputErrorsBag',
        value: { password: 'Invalid email or password.' },
      },
      {
        key: 'notification',
        value: { message: 'Invalid email or password.', type: 'error' },
      },
      {
        key: 'inputErrorsBag',
        value: { currentPassword: 'Session has expired or is invalid' },
      },
      {
        key: 'notification',
        value: { message: 'Session has expired or is invalid', type: 'error' },
      },
      {
        key: 'inputErrorsBag',
        value: { email: 'A user with this email already exists' },
      },
      {
        key: 'notification',
        value: { message: 'A user with this email already exists', type: 'error' },
      },
      {
        key: 'inputErrorsBag',
        value: { email: 'Email address has not been verified' },
      },
      {
        key: 'notification',
        value: { message: 'Email address has not been verified', type: 'error' },
      },
      {
        key: 'inputErrorsBag',
        value: { email: 'User not found' },
      },
      {
        key: 'notification',
        value: { message: 'User not found', type: 'error' },
      },
      {
        key: 'inputErrorsBag',
        value: { email: 'The email address is invalid.' },
      },
      {
        key: 'notification',
        value: { message: 'The email address is invalid.', type: 'error' },
      },
      {
        key: 'inputErrorsBag',
        value: { newPassword: 'The link has expired or is invalid.' },
      },
      {
        key: 'notification',
        value: { message: 'The link has expired or is invalid.', type: 'error' },
      },
      {
        key: 'inputErrorsBag',
        value: { name: 'An unexpected authentication error occurred. Please try again.' },
      },
      {
        key: 'notification',
        value: {
          message: 'An unexpected authentication error occurred. Please try again.',
          type: 'error',
        },
      },
    ])
  })
})
