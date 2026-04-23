import { type DomainError } from '#core/common/errors/domain_error'
import { test } from '@japa/runner'

import { normalizeExpenseInput } from './validation.js'

test.group('expense validation', () => {
  test('normalizes expense input and trims the label', ({ assert }) => {
    const normalized = normalizeExpenseInput({
      amount: 12.345,
      category: 'Software',
      date: '2026-04-20',
      label: ' Cursor subscription ',
    })

    assert.deepEqual(normalized, {
      amountCents: 1235,
      category: 'Software',
      date: '2026-04-20',
      label: 'Cursor subscription',
    })
  })

  test('rejects malformed dates outside the HTTP layer', ({ assert }) => {
    let error: DomainError | undefined

    try {
      normalizeExpenseInput({
        amount: 10,
        category: 'Software',
        date: 'not-a-date',
        label: 'Invalid date',
      })
    } catch (caught) {
      error = caught as DomainError
    }

    if (!error) {
      throw new Error('Expected normalizeExpenseInput to throw a DomainError')
    }

    assert.equal(error.type, 'invalid_data')
    assert.equal(error.message, 'Expense date must be a valid calendar date.')
  })

  test('rejects impossible calendar dates outside the HTTP layer', ({ assert }) => {
    let error: DomainError | undefined

    try {
      normalizeExpenseInput({
        amount: 10,
        category: 'Software',
        date: '2026-02-30',
        label: 'Invalid calendar date',
      })
    } catch (caught) {
      error = caught as DomainError
    }

    if (!error) {
      throw new Error('Expected normalizeExpenseInput to reject impossible calendar dates')
    }

    assert.equal(error.type, 'invalid_data')
    assert.equal(error.message, 'Expense date must be a valid calendar date.')
  })
})
