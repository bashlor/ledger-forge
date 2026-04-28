import type { DateRange, DateScope } from '~/lib/types'

import { DISPLAY_LOCALE } from '~/lib/format'
import { parseDateOnlyUtc, toDateOnlyUtc } from '~/lib/date'

const monthFormatter = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  month: 'long',
  year: 'numeric',
})

const rangeFormatter = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export function createCurrentMonthDateScope(referenceDate = new Date()): DateScope {
  const year = referenceDate.getUTCFullYear()
  const month = referenceDate.getUTCMonth()

  return createMonthDateScope(year, month)
}

export function createCustomDateScope(range: DateRange): DateScope {
  return {
    ...range,
    label: formatRangeLabel(range),
    mode: 'custom',
  }
}

export function createMonthDateScope(year: number, monthIndex: number): DateScope {
  const startDate = toDateOnlyUtc(new Date(Date.UTC(year, monthIndex, 1)))
  const endDate = toDateOnlyUtc(new Date(Date.UTC(year, monthIndex + 1, 0)))

  return {
    endDate,
    label: monthFormatter.format(new Date(Date.UTC(year, monthIndex, 1))),
    mode: 'month',
    startDate,
  }
}

export function formatDateScopeCaption(scope: DateScope) {
  if (scope.mode === 'month') {
    return `${formatDateOnlyNumericFr(scope.startDate)} — ${formatDateOnlyNumericFr(scope.endDate)}`
  }
  return `${formatDateOnlyNumericFr(scope.startDate)} — ${formatDateOnlyNumericFr(scope.endDate)}`
}

export function isDateWithinScope(value: string, scope: DateScope) {
  return value >= scope.startDate && value <= scope.endDate
}

export function isValidDateRange(range: DateRange) {
  return Boolean(range.startDate) && Boolean(range.endDate) && range.startDate <= range.endDate
}

export function shiftDateScope(scope: DateScope, delta: -1 | 1): DateScope {
  if (scope.mode === 'month') {
    const start = parseDateOnlyUtc(scope.startDate)
    return createMonthDateScope(start.getUTCFullYear(), start.getUTCMonth() + delta)
  }

  const daySpan = differenceInDaysInclusive(scope.startDate, scope.endDate)
  const nextStart = addUtcDays(parseDateOnlyUtc(scope.startDate), daySpan * delta)
  const nextEnd = addUtcDays(parseDateOnlyUtc(scope.endDate), daySpan * delta)

  return createCustomDateScope({
    endDate: toDateOnlyUtc(nextEnd),
    startDate: toDateOnlyUtc(nextStart),
  })
}

function addUtcDays(date: Date, days: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days))
}

function differenceInDaysInclusive(startDate: string, endDate: string) {
  const diffMs = parseDateOnlyUtc(endDate).getTime() - parseDateOnlyUtc(startDate).getTime()
  return Math.floor(diffMs / 86_400_000) + 1
}

function formatDateOnlyNumericFr(isoDate: string) {
  const d = parseDateOnlyUtc(isoDate)
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function formatRangeLabel(range: DateRange) {
  const start = parseDateOnlyUtc(range.startDate)
  const end = parseDateOnlyUtc(range.endDate)

  return `${rangeFormatter.format(start)} – ${rangeFormatter.format(end)}`
}
