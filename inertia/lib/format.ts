function parseDateValue(value: string) {
  return new Date(`${value}T12:00:00`)
}

const currencyFormatter = new Intl.NumberFormat('en-GB', {
  currency: 'EUR',
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: 'currency',
})

const shortDateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
})

const topbarDateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
})

export function formatCurrency(value: number) {
  return currencyFormatter.format(value)
}

export function formatShortDate(value: string) {
  return shortDateFormatter.format(parseDateValue(value))
}

export function formatSignedCurrency(value: number) {
  const formatted = currencyFormatter.format(Math.abs(value))
  return `${value >= 0 ? '+' : '-'}${formatted}`
}

export function formatTopbarDate(value: string) {
  return topbarDateFormatter.format(parseDateValue(value))
}

export function getInitials(value: string) {
  const initials = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')

  return initials || 'PL'
}
