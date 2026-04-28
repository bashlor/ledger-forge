import { describe, expect, it } from 'vitest'

import { formatCurrency, formatShortDate, formatSignedCurrency, formatTopbarDate } from './format'

describe('format helpers', () => {
  it('formats currency values', () => {
    expect(formatCurrency(1234.5)).toBe('1\u202f234,50\u00a0€')
    expect(formatSignedCurrency(12.3)).toBe('+12,30\u00a0€')
    expect(formatSignedCurrency(-12.3)).toBe('-12,30\u00a0€')
  })

  it('formats date labels', () => {
    expect(formatShortDate('2026-04-20')).toBe('20 avr.')
    expect(formatTopbarDate('2026-04-20')).toBe('20 avril')
  })
})
