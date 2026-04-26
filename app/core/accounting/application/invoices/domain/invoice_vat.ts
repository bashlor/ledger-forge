import { INVOICE_VAT_RATES } from '#core/accounting/invoice_vat_rates'
import { fromCents, toCents } from '#core/shared/money'

export const INVOICE_VAT_RATE_CENTS = INVOICE_VAT_RATES.map(toCents)

export function isAllowedInvoiceVatRate(rate: number): boolean {
  if (!Number.isFinite(rate)) {
    return false
  }

  const rateCents = toCents(rate)
  return rate === fromCents(rateCents) && INVOICE_VAT_RATE_CENTS.includes(rateCents)
}
