import { DomainError } from '#core/common/errors/domain_error'
import { test } from '@japa/runner'

import {
  assertDueDateIsNotBefore,
  assertInvoiceCanBeDeleted,
  assertInvoiceCanBeIssued,
  assertInvoiceCanBeMarkedPaid,
  assertInvoiceCanBeUpdated,
  assertInvoiceDates,
  normalizeIssueInvoiceInput,
  normalizeSaveInvoiceDraftInput,
} from './validation.js'

test.group('invoice validation helpers', () => {
  test('normalizes draft input and trims user-facing values', ({ assert }) => {
    const normalized = normalizeSaveInvoiceDraftInput({
      customerId: ' customer-1 ',
      dueDate: '2026-04-10',
      issueDate: '2026-04-01',
      lines: [{ description: ' Design work ', quantity: 2, unitPrice: 100, vatRate: 20 }],
    })

    assert.deepEqual(normalized, {
      customerId: 'customer-1',
      dueDate: '2026-04-10',
      issueDate: '2026-04-01',
      lines: [{ description: 'Design work', quantity: 2, unitPrice: 100, vatRate: 20 }],
    })
  })

  test('rejects invalid draft payloads with domain errors', ({ assert }) => {
    let error: DomainError | undefined

    try {
      normalizeSaveInvoiceDraftInput({
        customerId: '   ',
        dueDate: '',
        issueDate: 'bad-date',
        lines: [],
      })
    } catch (caught) {
      error = caught as DomainError
    }

    if (!error) {
      throw new Error('Expected normalizeSaveInvoiceDraftInput to throw a DomainError')
    }
    assert.instanceOf(error, DomainError)
    assert.equal(error.type, 'invalid_data')
  })

  test('enforces date ordering invariants', ({ assert }) => {
    let orderingError: DomainError | undefined
    let minDateError: DomainError | undefined

    try {
      assertInvoiceDates('2026-04-10', '2026-04-09')
    } catch (caught) {
      orderingError = caught as DomainError
    }

    try {
      assertDueDateIsNotBefore(
        '2026-04-09',
        '2026-04-10',
        'Due date must be on or after the draft creation date.'
      )
    } catch (caught) {
      minDateError = caught as DomainError
    }

    if (!orderingError) {
      throw new Error('Expected assertInvoiceDates to throw a DomainError')
    }
    assert.instanceOf(orderingError, DomainError)
    assert.equal(orderingError.message, 'Due date cannot be before the issue date.')
    if (!minDateError) {
      throw new Error('Expected assertDueDateIsNotBefore to throw a DomainError')
    }
    assert.instanceOf(minDateError, DomainError)
    assert.equal(minDateError.message, 'Due date must be on or after the draft creation date.')
  })

  test('normalizes issue payload and rejects missing company data', ({ assert }) => {
    const normalized = normalizeIssueInvoiceInput({
      issuedCompanyAddress: ' 1 Rue de Paris ',
      issuedCompanyName: ' Demo Accounting ',
    })

    assert.deepEqual(normalized, {
      issuedCompanyAddress: '1 Rue de Paris',
      issuedCompanyName: 'Demo Accounting',
    })

    let error: DomainError | undefined

    try {
      normalizeIssueInvoiceInput({ issuedCompanyAddress: ' ', issuedCompanyName: ' ' })
    } catch (caught) {
      error = caught as DomainError
    }

    if (!error) {
      throw new Error('Expected normalizeIssueInvoiceInput to throw a DomainError')
    }
    assert.instanceOf(error, DomainError)
    assert.equal(error.type, 'invalid_data')
  })

  test('exposes explicit status invariants for invoice lifecycle transitions', ({ assert }) => {
    assert.throws(() => assertInvoiceCanBeDeleted('paid'), DomainError)
    assert.throws(() => assertInvoiceCanBeIssued('issued'), DomainError)
    assert.throws(() => assertInvoiceCanBeMarkedPaid('draft'), DomainError)
    assert.throws(() => assertInvoiceCanBeUpdated('paid'), DomainError)

    assert.doesNotThrow(() => assertInvoiceCanBeDeleted('draft'))
    assert.doesNotThrow(() => assertInvoiceCanBeIssued('draft'))
    assert.doesNotThrow(() => assertInvoiceCanBeMarkedPaid('issued'))
    assert.doesNotThrow(() => assertInvoiceCanBeUpdated('draft'))
  })
})
