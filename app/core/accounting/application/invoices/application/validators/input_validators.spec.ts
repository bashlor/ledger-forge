import { DomainError } from '#core/common/errors/domain_error'
import { test } from '@japa/runner'

import { normalizeIssueInvoiceInput } from './issue_invoice_input.js'
import { normalizeSaveInvoiceDraftInput } from './save_invoice_draft_input.js'

test.group('invoice application input validators', () => {
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

  test('rejects impossible calendar dates in draft payload', ({ assert }) => {
    let error: DomainError | undefined

    try {
      normalizeSaveInvoiceDraftInput({
        customerId: 'customer-1',
        dueDate: '2026-02-30',
        issueDate: '2026-04-01',
        lines: [{ description: 'Design', quantity: 1, unitPrice: 100, vatRate: 20 }],
      })
    } catch (caught) {
      error = caught as DomainError
    }

    if (!error) {
      throw new Error('Expected normalizeSaveInvoiceDraftInput to reject invalid calendar dates')
    }
    assert.instanceOf(error, DomainError)
    assert.equal(error.type, 'invalid_data')
  })

  test('rejects unsupported invoice VAT rates', ({ assert }) => {
    for (const vatRate of [7, 19.6, 100]) {
      let error: DomainError | undefined

      try {
        normalizeSaveInvoiceDraftInput({
          customerId: 'customer-1',
          dueDate: '2026-04-30',
          issueDate: '2026-04-01',
          lines: [{ description: 'Design', quantity: 1, unitPrice: 100, vatRate }],
        })
      } catch (caught) {
        error = caught as DomainError
      }

      if (!error) {
        throw new Error(`Expected normalizeSaveInvoiceDraftInput to reject VAT rate ${vatRate}`)
      }
      assert.instanceOf(error, DomainError)
      assert.equal(error.type, 'invalid_data')
    }
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
})
