import { type DomainError } from '#core/common/errors/domain_error'
import { test } from '@japa/runner'

import { normalizeCustomerInput } from './validation.js'

test.group('customer validation', () => {
  test('normalizes customer input and trims optional fields', ({ assert }) => {
    const normalized = normalizeCustomerInput({
      address: ' 1 rue Demo ',
      company: ' Demo Co ',
      email: ' demo@example.com ',
      name: ' Demo User ',
      note: ' Important customer ',
      phone: ' +33 6 00 00 00 00 ',
    })

    assert.deepEqual(normalized, {
      address: '1 rue Demo',
      company: 'Demo Co',
      email: 'demo@example.com',
      name: 'Demo User',
      note: 'Important customer',
      phone: '+33 6 00 00 00 00',
    })
  })

  test('rejects payloads without email and phone after trim', ({ assert }) => {
    let error: DomainError | undefined

    try {
      normalizeCustomerInput({
        address: '1 rue Demo',
        company: 'Demo Co',
        email: '   ',
        name: 'Demo User',
        phone: '   ',
      })
    } catch (caught) {
      error = caught as DomainError
    }

    if (!error) {
      throw new Error('Expected normalizeCustomerInput to throw a DomainError')
    }

    assert.equal(error.type, 'invalid_data')
    assert.equal(error.message, 'Provide at least an email or a phone number.')
  })
})
