import { DomainError } from '#core/common/errors/domain_error'
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
      presentation: 'form',
      status: 401,
    })

    assert.deepEqual(
      resolvePublicError(new SessionExpiredError(), { errorKey: 'E_CHANGE_PASSWORD' }),
      {
        code: 'auth.session_expired',
        fieldBag: { currentPassword: 'Session has expired or is invalid' },
        message: 'Session has expired or is invalid',
        presentation: 'form',
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
        presentation: 'form',
        status: 500,
      }
    )
  })

  test('maps allowlisted accounting domain errors to stable public codes and field bags', ({
    assert,
  }) => {
    assert.deepEqual(
      resolvePublicError(new DomainError('Customer address is required.', 'invalid_data')),
      {
        code: 'accounting.customer_missing_address',
        fieldBag: { address: 'Customer address is required.' },
        message: 'Customer address is required.',
        presentation: 'notification',
        status: 422,
      }
    )

    assert.deepEqual(
      resolvePublicError(
        new DomainError('Invoice not found.', 'not_found', 'InvoiceNotFoundError')
      ),
      {
        code: 'accounting.invoice_not_found',
        message: 'Invoice not found.',
        presentation: 'status_page',
        status: 404,
      }
    )

    assert.deepEqual(
      resolvePublicError(
        new DomainError('Only draft expenses can be confirmed.', 'business_logic_error')
      ),
      {
        code: 'accounting.expense_confirm_draft_only',
        message: 'Only draft expenses can be confirmed.',
        presentation: 'notification',
        status: 422,
      }
    )
  })

  test('maps better auth codes without leaking upstream detail strings', ({ assert }) => {
    assert.deepEqual(resolveBetterAuthPublicError('INVALID_EMAIL_OR_PASSWORD'), {
      code: 'auth.invalid_credentials',
      message: 'Invalid email or password.',
      presentation: 'form',
      status: 401,
    })

    assert.deepEqual(resolveBetterAuthPublicError('SOME_UNKNOWN_CODE'), {
      code: 'auth.provider_failure',
      message: 'An unexpected error occurred. Please try again.',
      presentation: 'form',
      status: 500,
    })
  })

  test('sanitizes non-allowlisted domain errors', ({ assert }) => {
    assert.deepEqual(
      resolvePublicError(new DomainError('Leaky business detail', 'business_logic_error')),
      {
        code: 'domain.business_logic_error',
        message: 'The requested action could not be completed.',
        presentation: 'notification',
        status: 422,
      }
    )
  })

  test('keeps controlled auth-domain failures safe and field-aware', ({ assert }) => {
    assert.deepEqual(
      resolvePublicError(
        new DomainError('The email address is invalid.', 'invalid_data', 'InvalidAuthPayloadError')
      ),
      {
        code: 'auth.invalid_payload',
        fieldBag: { email: 'The email address is invalid.' },
        message: 'The email address is invalid.',
        presentation: 'form',
        status: 422,
      }
    )

    assert.deepEqual(
      resolvePublicError(
        new DomainError(
          'The link has expired or is invalid.',
          'unauthorized_user_operation',
          'InvalidTokenError'
        ),
        { errorKey: 'E_RESET_PASSWORD' }
      ),
      {
        code: 'auth.invalid_token',
        fieldBag: { newPassword: 'The link has expired or is invalid.' },
        message: 'The link has expired or is invalid.',
        presentation: 'form',
        status: 401,
      }
    )

    assert.deepEqual(
      resolvePublicError(
        new DomainError(
          'Your session has expired. Please sign in again.',
          'unauthorized_user_operation',
          'InvalidTokenError'
        )
      ),
      {
        code: 'auth.session_expired',
        fieldBag: { password: 'Your session has expired. Please sign in again.' },
        message: 'Your session has expired. Please sign in again.',
        presentation: 'form',
        status: 401,
      }
    )

    assert.deepEqual(
      resolvePublicError(
        new DomainError('Session has expired or is invalid', 'unauthorized_user_operation')
      ),
      {
        code: 'auth.session_expired',
        fieldBag: { password: 'Session has expired or is invalid' },
        message: 'Session has expired or is invalid',
        presentation: 'form',
        status: 401,
      }
    )
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
        presentation: 'notification',
        status: 503,
      }
    )
  })
})
