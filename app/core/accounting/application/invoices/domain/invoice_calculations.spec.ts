import { test } from '@japa/runner'

import { calculateLine, fromDisplayUnits } from './invoice_calculations.js'

test.group('invoice calculations', () => {
  test('calculates line totals in cents for supported VAT rates', ({ assert }) => {
    const cases = [
      { expectedInclTax: 12_000, expectedVat: 2_000, vatRate: 20 },
      { expectedInclTax: 11_000, expectedVat: 1_000, vatRate: 10 },
      { expectedInclTax: 10_550, expectedVat: 550, vatRate: 5.5 },
      { expectedInclTax: 10_000, expectedVat: 0, vatRate: 0 },
    ]

    for (const entry of cases) {
      const line = calculateLine(
        fromDisplayUnits({
          description: 'Service',
          quantity: 1,
          unitPrice: 100,
          vatRate: entry.vatRate,
        })
      )

      assert.equal(line.lineTotalExclTaxCents, 10_000)
      assert.equal(line.lineTotalVatCents, entry.expectedVat)
      assert.equal(line.lineTotalInclTaxCents, entry.expectedInclTax)
    }
  })

  test('rounds quantity and VAT at line cent precision', ({ assert }) => {
    const line = calculateLine(
      fromDisplayUnits({
        description: 'Fractional service',
        quantity: 2.5,
        unitPrice: 19.99,
        vatRate: 20,
      })
    )

    assert.equal(line.lineTotalExclTaxCents, 4_998)
    assert.equal(line.lineTotalVatCents, 1_000)
    assert.equal(line.lineTotalInclTaxCents, 5_998)
  })
})
