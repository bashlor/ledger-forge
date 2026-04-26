import { describe, expect, it } from 'vitest'

import { canEditInvoice, canIssueInvoice, createEmptyInvoiceLine } from './invoices'

describe('invoice helpers', () => {
  it('creates a default invoice line input without calculating totals', () => {
    expect(createEmptyInvoiceLine()).toEqual({
      description: '',
      quantity: 1,
      unitPrice: 0,
      vatRate: 20,
    })
  })

  it('keeps invoice action helpers focused on status rules', () => {
    expect(canEditInvoice({ status: 'draft' })).toBe(true)
    expect(canIssueInvoice({ status: 'draft' })).toBe(true)
    expect(canEditInvoice({ status: 'issued' })).toBe(false)
    expect(canIssueInvoice({ status: 'paid' })).toBe(false)
  })
})
