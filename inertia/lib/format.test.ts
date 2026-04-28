import { describe, expect, it } from 'vitest'

import { formatCurrency, formatShortDate, formatSignedCurrency, formatTopbarDate, resolveTopbarDisplayName } from './format'

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

  it('resolves topbar display name for anonymous and placeholder emails', () => {
    expect(resolveTopbarDisplayName('', 'temp@throwaway.test', true)).toBe('Anonymous')
    expect(resolveTopbarDisplayName('  ', 'temp@throwaway.test', false)).toBe('Account')
    expect(resolveTopbarDisplayName('', 'jane@example.com', false)).toBe('jane')
    expect(resolveTopbarDisplayName('Jane Doe', 'j@e.com', false)).toBe('Jane Doe')
  })
})
