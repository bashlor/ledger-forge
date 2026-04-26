import { test } from '@japa/runner'

import { previewInvoiceDraft } from './preview_invoice_draft.js'

test.group('preview invoice draft', () => {
  test('returns server-calculated line totals and invoice totals without persistence', ({
    assert,
  }) => {
    const preview = previewInvoiceDraft({
      lines: [
        { description: ' Design ', quantity: 2, unitPrice: 100, vatRate: 20 },
        { description: 'Support', quantity: 1.5, unitPrice: 80, vatRate: 10 },
      ],
    })

    assert.deepEqual(preview, {
      lines: [
        {
          description: 'Design',
          lineTotalExclTax: 200,
          lineTotalInclTax: 240,
          lineVatAmount: 40,
          quantity: 2,
          unitPrice: 100,
          vatRate: 20,
        },
        {
          description: 'Support',
          lineTotalExclTax: 120,
          lineTotalInclTax: 132,
          lineVatAmount: 12,
          quantity: 1.5,
          unitPrice: 80,
          vatRate: 10,
        },
      ],
      subtotalExclTax: 320,
      totalInclTax: 372,
      totalVat: 52,
    })
  })
})
