import type { DateRange, DateScope } from '~/lib/types'

const monthFormatter = new Intl.DateTimeFormat('en-GB', {
  month: 'long',
  year: 'numeric',
})

const rangeFormatter = new Intl.DateTimeFormat('en-GB', {
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
  const startDate = toDateOnly(new Date(Date.UTC(year, monthIndex, 1)))
  const endDate = toDateOnly(new Date(Date.UTC(year, monthIndex + 1, 0)))

  return {
    endDate,
    label: monthFormatter.format(new Date(Date.UTC(year, monthIndex, 1))),
    mode: 'month',
    startDate,
  }
}

export function shiftDateScope(scope: DateScope, delta: -1 | 1): DateScope {
  if (scope.mode === 'month') {
    const start = parseDateOnly(scope.startDate)
    return createMonthDateScope(start.getUTCFullYear(), start.getUTCMonth() + delta)
  }

  const daySpan = differenceInDaysInclusive(scope.startDate, scope.endDate)
  const nextStart = addUtcDays(parseDateOnly(scope.startDate), daySpan * delta)
  const nextEnd = addUtcDays(parseDateOnly(scope.endDate), daySpan * delta)

  return createCustomDateScope({
    endDate: toDateOnly(nextEnd),
    startDate: toDateOnly(nextStart),
  })
}

export function isDateWithinScope(value: string, scope: DateScope) {
  return value >= scope.startDate && value <= scope.endDate
}

export function isValidDateRange(range: DateRange) {
  return Boolean(range.startDate) && Boolean(range.endDate) && range.startDate <= range.endDate
}

export function formatDateScopeCaption(scope: DateScope) {
  return scope.mode === 'month' ? `${scope.startDate} -> ${scope.endDate}` : 'Custom range'
}

function formatRangeLabel(range: DateRange) {
  const start = parseDateOnly(range.startDate)
  const end = parseDateOnly(range.endDate)

  return `${rangeFormatter.format(start)} - ${rangeFormatter.format(end)}`
}

function differenceInDaysInclusive(startDate: string, endDate: string) {
  const diffMs = parseDateOnly(endDate).getTime() - parseDateOnly(startDate).getTime()
  return Math.floor(diffMs / 86_400_000) + 1
}

function addUtcDays(date: Date, days: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days))
}

function parseDateOnly(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function toDateOnly(value: Date) {
  const year = value.getUTCFullYear()
  const month = String(value.getUTCMonth() + 1).padStart(2, '0')
  const day = String(value.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
