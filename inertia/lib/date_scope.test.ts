import { describe, expect, it } from 'vitest'

import {
  createCurrentMonthDateScope,
  createCustomDateScope,
  createMonthDateScope,
  formatDateScopeCaption,
  isDateWithinScope,
  isValidDateRange,
  shiftDateScope,
} from './date_scope'

describe('date scope helpers', () => {
  it('creates a month scope from a reference date', () => {
    const scope = createCurrentMonthDateScope(new Date(Date.UTC(2026, 3, 20)))
    expect(scope.startDate).toBe('2026-04-01')
    expect(scope.endDate).toBe('2026-04-30')
    expect(scope.mode).toBe('month')
  })

  it('validates membership and caption', () => {
    const scope = createMonthDateScope(2026, 3)
    expect(isDateWithinScope('2026-04-15', scope)).toBe(true)
    expect(isDateWithinScope('2026-05-01', scope)).toBe(false)
    expect(formatDateScopeCaption(scope)).toBe('2026-04-01 -> 2026-04-30')
  })

  it('shifts custom ranges by inclusive span', () => {
    const scope = createCustomDateScope({ endDate: '2026-04-03', startDate: '2026-04-01' })
    const next = shiftDateScope(scope, 1)
    expect(next.startDate).toBe('2026-04-04')
    expect(next.endDate).toBe('2026-04-06')
    expect(next.mode).toBe('custom')
  })

  it('validates date range ordering', () => {
    expect(isValidDateRange({ endDate: '2026-04-01', startDate: '2026-04-01' })).toBe(true)
    expect(isValidDateRange({ endDate: '2026-04-01', startDate: '2026-04-02' })).toBe(false)
  })
})
