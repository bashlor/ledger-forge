import { DomainError } from '#core/common/errors/domain_error'
import { resolvePublicError } from '#core/common/errors/public_error'
import { test } from '@japa/runner'

import { shouldPresentDomainErrorAsFormRedirect } from './handler.js'

function createContext(method: string, acceptedType: string) {
  return {
    request: {
      accepts(types: string[]) {
        return types.includes(acceptedType) ? acceptedType : null
      },
      method() {
        return method
      },
    },
  }
}

test.group('shouldPresentDomainErrorAsFormRedirect', () => {
  test('routes explicit form presentations for non-GET HTML requests', ({ assert }) => {
    const ctx = createContext('POST', 'html')
    const error = new DomainError(
      'Session has expired or is invalid',
      'unauthorized_user_operation'
    )

    assert.isTrue(shouldPresentDomainErrorAsFormRedirect(resolvePublicError(error), ctx as never))
  })

  test('does not route notification presentations through the form presenter', ({ assert }) => {
    const ctx = createContext('POST', 'html')
    const error = new DomainError('Invoice not found.', 'not_found', 'InvoiceNotFoundError')

    assert.isFalse(shouldPresentDomainErrorAsFormRedirect(resolvePublicError(error), ctx as never))
  })

  test('does not route GET requests even for auth-like domain errors', ({ assert }) => {
    const ctx = createContext('GET', 'html')
    const error = new DomainError(
      'Session has expired or is invalid',
      'unauthorized_user_operation'
    )

    assert.isFalse(shouldPresentDomainErrorAsFormRedirect(resolvePublicError(error), ctx as never))
  })

  test('does not route non-form presentations even when they are not GET', ({ assert }) => {
    const ctx = createContext('POST', 'html')
    const error = new DomainError('Opaque provider failure', 'unspecified_internal_error')

    assert.isFalse(shouldPresentDomainErrorAsFormRedirect(resolvePublicError(error), ctx as never))
  })
})
