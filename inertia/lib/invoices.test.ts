import { describe, expect, it } from 'vitest'

import { calculateInvoiceLine, calculateInvoiceTotals } from './invoices'

describe('invoice helpers', () => {
  it('calculates line totals with rounding', () => {
    const line = calculateInvoiceLine({
      description: 'Service',
      quantity: 2.5,
      unitPrice: 19.99,
      vatRate: 20,
    })

    expect(line.lineTotalExclTax).toBe(49.97)
    expect(line.lineVatAmount).toBe(9.99)
    expect(line.lineTotalInclTax).toBe(59.96)
  })

  it('aggregates totals across lines', () => {
    const totals = calculateInvoiceTotals([
      { description: 'Design', quantity: 1, unitPrice: 100, vatRate: 20 },
      { description: 'Audit', quantity: 2, unitPrice: 50, vatRate: 10 },
    ])

    expect(totals.subtotalExclTax).toBe(200)
    expect(totals.totalVat).toBe(30)
    expect(totals.totalInclTax).toBe(230)
  })
})
