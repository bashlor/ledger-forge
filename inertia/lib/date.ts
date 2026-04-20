export function addDaysDateOnlyUtc(value: string, days: number): string {
  const date = parseDateOnlyUtc(value)
  const next = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days)
  )
  return toDateOnlyUtc(next)
}

export function parseDateOnlyForDisplay(value: string): Date {
  return new Date(`${value}T12:00:00`)
}

export function parseDateOnlyUtc(value: string): Date {
  const [yearPart, monthPart, dayPart] = value.split('-')
  const year = Number(yearPart)
  const month = Number(monthPart)
  const day = Number(dayPart)

  return new Date(Date.UTC(year, month - 1, day))
}

export function toDateOnlyUtc(value: Date): string {
  const year = value.getUTCFullYear()
  const month = String(value.getUTCMonth() + 1).padStart(2, '0')
  const day = String(value.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function todayDateOnlyUtc(referenceDate = new Date()): string {
  return toDateOnlyUtc(referenceDate)
}
