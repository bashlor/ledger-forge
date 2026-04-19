import { test } from '@japa/runner'

import {
  prepareDraftInvoiceWrite,
  prepareInvoiceLinesWrite,
  prepareSendInvoiceWrite,
} from './use_case_support.js'

test.group('invoice use case support helpers', () => {
  test('prepares draft write payloads and invoice lines without side effects', ({ assert }) => {
    const preparedLines = prepareInvoiceLinesWrite([
      { description: ' Design ', quantity: 2, unitPrice: 100, vatRate: 20 },
      { description: 'Support', quantity: 1.5, unitPrice: 80, vatRate: 10 },
    ])

    const customer = {
      address: '10 rue de la Paix, 75002 Paris',
      company: 'Acme',
      email: 'billing@acme.test',
      name: 'Alice',
      phone: '+33 6 00 00 00 00',
    }

    const draftWrite = prepareDraftInvoiceWrite({
      customer,
      customerId: 'customer-1',
      dueDate: '2026-04-10',
      issueDate: '2026-04-01',
      issuedCompanyAddress: '',
      issuedCompanyName: '',
      totals: preparedLines.totals,
    })

    assert.lengthOf(preparedLines.lineValues, 2)
    assert.equal(preparedLines.lineValues[0].lineNumber, 1)
    assert.equal(preparedLines.lineValues[0].description, ' Design ')
    assert.equal(preparedLines.totals.subtotalExclTaxCents, 32000)
    assert.equal(preparedLines.totals.totalVatCents, 5200)
    assert.equal(preparedLines.totals.totalInclTaxCents, 37200)
    assert.equal(draftWrite.customerCompanyName, 'Acme')
    assert.equal(draftWrite.customerCompanySnapshot, 'Acme')
    assert.equal(draftWrite.customerId, 'customer-1')
    assert.equal(draftWrite.issuedCompanyName, '')
  })

  test('prepares the issued invoice snapshot payload', ({ assert }) => {
    const sendWrite = prepareSendInvoiceWrite({
      customer: {
        address: '10 rue de la Paix, 75002 Paris',
        company: 'Acme',
        email: 'billing@acme.test',
        name: 'Alice',
        phone: '+33 6 00 00 00 00',
      },
      issuedCompanyAddress: '1 rue de Paris',
      issuedCompanyName: 'Demo Accounting',
    })

    assert.equal(sendWrite.customerCompanyName, 'Acme')
    assert.equal(sendWrite.customerEmailSnapshot, 'billing@acme.test')
    assert.equal(sendWrite.issuedCompanyName, 'Demo Accounting')
    assert.equal(sendWrite.issuedCompanyAddress, '1 rue de Paris')
  })
})
