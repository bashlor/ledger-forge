import { parseDateOnlyForDisplay } from '~/lib/date'

/** Single display locale for currency and dates (deterministic SSR/tests). */
export const DISPLAY_LOCALE = 'fr-FR' as const

const currencyFormatter = new Intl.NumberFormat(DISPLAY_LOCALE, {
  currency: 'EUR',
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: 'currency',
})

const shortDateFormatter = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  day: 'numeric',
  month: 'short',
})

const topbarDateFormatter = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  day: 'numeric',
  month: 'long',
})

export function formatCurrency(value: number) {
  return currencyFormatter.format(value)
}

export function formatShortDate(value: string) {
  return shortDateFormatter.format(parseDateOnlyForDisplay(value))
}

export function formatSignedCurrency(value: number) {
  const formatted = currencyFormatter.format(Math.abs(value))
  return `${value >= 0 ? '+' : '-'}${formatted}`
}

export function formatTopbarDate(value: string) {
  return topbarDateFormatter.format(parseDateOnlyForDisplay(value))
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
