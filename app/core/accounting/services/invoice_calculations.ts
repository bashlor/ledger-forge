/**
 * Pure arithmetic for invoice lines and totals.
 * All values are stored as integers in cents or cent-equivalents.
 *
 * Stored representation in DB:
 *   quantityCents  = quantity × 100       (e.g. quantity 2 → 200)
 *   unitPriceCents = unit price in cents   (e.g. €100.50 → 10050)
 *   vatRateCents   = vat rate × 100        (e.g. 20% → 2000)
 */

export interface InvoiceTotals {
  subtotalExclTaxCents: number
  totalInclTaxCents: number
  totalVatCents: number
}

export interface LineCalc {
  lineTotalExclTaxCents: number
  lineTotalInclTaxCents: number
  lineTotalVatCents: number
}

export interface LineInput {
  description: string
  quantityCents: number
  unitPriceCents: number
  vatRateCents: number
}

/**
 * Recalculate derived totals for a single line.
 * Never trust values from the request body -- always call this server-side.
 */
export function calculateLine(
  line: Pick<LineInput, 'quantityCents' | 'unitPriceCents' | 'vatRateCents'>
): LineCalc {
  const lineTotalExclTaxCents = Math.round((line.quantityCents * line.unitPriceCents) / 100)
  const lineTotalVatCents = Math.round((lineTotalExclTaxCents * line.vatRateCents) / 10000)
  return {
    lineTotalExclTaxCents,
    lineTotalInclTaxCents: lineTotalExclTaxCents + lineTotalVatCents,
    lineTotalVatCents,
  }
}

/**
 * Aggregate per-line results into invoice-level totals.
 */
export function calculateTotals(lines: LineCalc[]): InvoiceTotals {
  return lines.reduce(
    (acc, line) => ({
      subtotalExclTaxCents: acc.subtotalExclTaxCents + line.lineTotalExclTaxCents,
      totalInclTaxCents: acc.totalInclTaxCents + line.lineTotalInclTaxCents,
      totalVatCents: acc.totalVatCents + line.lineTotalVatCents,
    }),
    { subtotalExclTaxCents: 0, totalInclTaxCents: 0, totalVatCents: 0 }
  )
}

/**
 * Convert display-unit inputs (euros / percentage) to stored cents.
 * Called once per line when creating or updating a draft.
 */
export function fromDisplayUnits(input: {
  description: string
  quantity: number
  unitPrice: number
  vatRate: number
}): LineInput {
  return {
    description: input.description,
    quantityCents: Math.round(input.quantity * 100),
    unitPriceCents: Math.round(input.unitPrice * 100),
    vatRateCents: Math.round(input.vatRate * 100),
  }
}
