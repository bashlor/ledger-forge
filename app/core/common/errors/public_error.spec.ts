import { DomainError } from '#core/shared/domain_error'
import {
  AuthenticationError,
  InvalidCredentialsError,
  SessionExpiredError,
} from '#core/user_management/domain/errors'
import { test } from '@japa/runner'

import { resolveBetterAuthPublicError, resolvePublicError } from './public_error.js'

test.group('resolvePublicError', () => {
  test('maps expected auth failures to stable public messages and field bags', ({ assert }) => {
    assert.deepEqual(resolvePublicError(new InvalidCredentialsError()), {
      code: 'auth.invalid_credentials',
      fieldBag: { password: 'Invalid email or password.' },
      message: 'Invalid email or password.',
      status: 401,
    })

    assert.deepEqual(
      resolvePublicError(new SessionExpiredError(), { errorKey: 'E_CHANGE_PASSWORD' }),
      {
        code: 'auth.session_expired',
        fieldBag: { currentPassword: 'Session has expired or is invalid' },
        message: 'Session has expired or is invalid',
        status: 401,
      }
    )
  })

  test('sanitizes generic authentication failures', ({ assert }) => {
    assert.deepEqual(
      resolvePublicError(new AuthenticationError('Leaky internal detail'), {
        errorKey: 'E_UPDATE_PROFILE',
      }),
      {
        code: 'auth.provider_failure',
        fieldBag: { name: 'An unexpected authentication error occurred. Please try again.' },
        message: 'An unexpected authentication error occurred. Please try again.',
        status: 500,
      }
    )
  })

  test('keeps domain-business messages while assigning stable codes', ({ assert }) => {
    assert.deepEqual(
      resolvePublicError(
        new DomainError('Invoice not found.', 'not_found', 'InvoiceNotFoundError')
      ),
      {
        code: 'domain.not_found',
        message: 'Invoice not found.',
        status: 404,
      }
    )
  })

  test('maps better auth codes without leaking upstream detail strings', ({ assert }) => {
    assert.deepEqual(resolveBetterAuthPublicError('INVALID_EMAIL_OR_PASSWORD'), {
      code: 'auth.invalid_credentials',
      message: 'Invalid email or password.',
      status: 401,
    })

    assert.deepEqual(resolveBetterAuthPublicError('SOME_UNKNOWN_CODE'), {
      code: 'auth.provider_failure',
      message: 'An unexpected error occurred. Please try again.',
      status: 500,
    })
  })

  test('supports controlled exposure of internal messages for generic errors', ({ assert }) => {
    assert.deepEqual(
      resolvePublicError(new Error('Database unavailable'), {
        exposeInternalMessage: true,
        statusOverride: 503,
      }),
      {
        code: 'app.unexpected_error',
        message: 'Database unavailable',
        status: 503,
      }
    )
  })
})
