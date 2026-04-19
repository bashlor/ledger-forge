import { toCents } from '#core/shared/money'

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
  quantityHundredths: number
  unitPriceCents: number
  vatRateCents: number
}

export function calculateLine(
  line: Pick<LineInput, 'quantityHundredths' | 'unitPriceCents' | 'vatRateCents'>
): LineCalc {
  const lineTotalExclTaxCents = Math.round((line.quantityHundredths * line.unitPriceCents) / 100)
  const lineTotalVatCents = Math.round((lineTotalExclTaxCents * line.vatRateCents) / 10000)
  return {
    lineTotalExclTaxCents,
    lineTotalInclTaxCents: lineTotalExclTaxCents + lineTotalVatCents,
    lineTotalVatCents,
  }
}

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

export function fromDisplayUnits(input: {
  description: string
  quantity: number
  unitPrice: number
  vatRate: number
}): LineInput {
  return {
    description: input.description,
    quantityHundredths: toCents(input.quantity),
    unitPriceCents: toCents(input.unitPrice),
    vatRateCents: toCents(input.vatRate),
  }
}
