import { DomainError } from '#core/shared/domain_error'
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
  authFailureToInputErrorsBag,
  authFailureToNotificationMessage,
  flashInertiaInputErrors,
} from './inertia_input_errors.js'

test.group('inertia input errors', () => {
  test('maps core auth failures to the expected form fields', ({ assert }) => {
    assert.deepEqual(authFailureToInputErrorsBag(new InvalidCredentialsError()), {
      password: 'Invalid email or password.',
    })
    assert.deepEqual(authFailureToInputErrorsBag(new UserAlreadyExistsError()), {
      email: 'A user with this email already exists',
    })
    assert.deepEqual(authFailureToInputErrorsBag(new EmailNotVerifiedError()), {
      email: 'Email address has not been verified',
    })
    assert.deepEqual(authFailureToInputErrorsBag(new UserNotFoundError()), {
      email: 'User not found',
    })
  })

  test('maps session and generic auth errors using the provided error key', ({ assert }) => {
    assert.deepEqual(authFailureToInputErrorsBag(new SessionExpiredError()), {
      password: 'Session has expired or is invalid',
    })
    assert.deepEqual(
      authFailureToInputErrorsBag(new SessionExpiredError(), { errorKey: 'E_CHANGE_PASSWORD' }),
      {
        currentPassword: 'Session has expired or is invalid',
      }
    )
    assert.deepEqual(
      authFailureToInputErrorsBag(new AuthenticationError('Reset failed'), {
        errorKey: 'E_RESET_PASSWORD',
      }),
      {
        newPassword: 'An unexpected authentication error occurred. Please try again.',
        token: 'An unexpected authentication error occurred. Please try again.',
      }
    )
    assert.deepEqual(
      authFailureToInputErrorsBag(new AuthenticationError('Profile failed'), {
        errorKey: 'E_UPDATE_PROFILE',
      }),
      {
        name: 'An unexpected authentication error occurred. Please try again.',
      }
    )
  })

  test('maps domain auth payload and token errors to the right fields', ({ assert }) => {
    const invalidPayload = new DomainError(
      'Email is invalid',
      'invalid_data',
      'InvalidAuthPayloadError'
    )
    const invalidToken = new DomainError('Invalid token', 'invalid_data', 'InvalidTokenError')

    assert.deepEqual(authFailureToInputErrorsBag(invalidPayload), {
      email: 'Email is invalid',
    })
    assert.deepEqual(authFailureToInputErrorsBag(invalidToken, { errorKey: 'E_RESET_PASSWORD' }), {
      newPassword: 'Invalid token',
    })
    assert.deepEqual(authFailureToInputErrorsBag(new Error('Unknown')), {})
  })

  test('flashes the bag only when there are actual errors', ({ assert }) => {
    const flashes: Array<{ key: string; value: unknown }> = []
    const ctx = {
      session: {
        flash(key: string, value: unknown) {
          flashes.push({ key, value })
        },
      },
    }

    flashInertiaInputErrors(ctx as never, {})
    flashInertiaInputErrors(ctx as never, { email: 'Invalid' })

    assert.deepEqual(flashes, [{ key: 'inputErrorsBag', value: { email: 'Invalid' } }])
  })

  test('builds a sanitized notification message for auth failures', ({ assert }) => {
    assert.equal(
      authFailureToNotificationMessage(new InvalidCredentialsError(), {
        errorKey: 'E_SIGNIN_ERROR',
      }),
      'Invalid email or password.'
    )
    assert.equal(
      authFailureToNotificationMessage(new AuthenticationError('Leaky internal detail'), {
        errorKey: 'E_UPDATE_PROFILE',
      }),
      'An unexpected authentication error occurred. Please try again.'
    )
  })
})
