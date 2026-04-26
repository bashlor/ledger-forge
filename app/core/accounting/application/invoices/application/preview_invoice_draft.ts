import { fromCents } from '#core/shared/money'

import type { InvoicePreviewDto, PreviewInvoiceDraftInput } from '../types.js'

import { calculateLine, calculateTotals, fromDisplayUnits } from '../domain/invoice_calculations.js'
import { normalizeSaveInvoiceLineInput } from './validators/save_invoice_draft_input.js'

export function previewInvoiceDraft(input: PreviewInvoiceDraftInput): InvoicePreviewDto {
  const normalizedLines = input.lines.map(normalizeSaveInvoiceLineInput)
  const lineInputs = normalizedLines.map(fromDisplayUnits)
  const calculatedLines = lineInputs.map(calculateLine)
  const totals = calculateTotals(calculatedLines)

  return {
    lines: normalizedLines.map((line, index) => ({
      description: line.description,
      lineTotalExclTax: fromCents(calculatedLines[index].lineTotalExclTaxCents),
      lineTotalInclTax: fromCents(calculatedLines[index].lineTotalInclTaxCents),
      lineVatAmount: fromCents(calculatedLines[index].lineTotalVatCents),
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      vatRate: line.vatRate,
    })),
    subtotalExclTax: fromCents(totals.subtotalExclTaxCents),
    totalInclTax: fromCents(totals.totalInclTaxCents),
    totalVat: fromCents(totals.totalVatCents),
  }
}
