import { describe, expect, it } from 'vitest'

import { formatCurrency, formatShortDate, formatSignedCurrency, formatTopbarDate } from './format'

describe('format helpers', () => {
  it('formats currency values', () => {
    expect(formatCurrency(1234.5)).toBe('€1,234.50')
    expect(formatSignedCurrency(12.3)).toBe('+€12.30')
    expect(formatSignedCurrency(-12.3)).toBe('-€12.30')
  })

  it('formats date labels', () => {
    expect(formatShortDate('2026-04-20')).toBe('20 Apr')
    expect(formatTopbarDate('2026-04-20')).toBe('20 April')
  })
})
