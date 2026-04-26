/**
 * Canonical list of allowed invoice VAT rates.
 *
 * This is the single source of truth for invoice-only VAT choices. Rates are
 * displayed as percentages and converted to cents before arithmetic.
 */
export const INVOICE_VAT_RATES = [0, 5.5, 10, 20] as const

export type InvoiceVatRate = (typeof INVOICE_VAT_RATES)[number]
