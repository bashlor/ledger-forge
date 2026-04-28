import { formatCurrency } from '~/lib/format'

interface Props {
  subtotalExclTax: number
  totalInclTax: number
  totalVat: number
}

export function InvoiceTotals({ subtotalExclTax, totalInclTax, totalVat }: Props) {
  return (
    <div className="rounded-2xl border border-border-default bg-primary/5 p-5 ring-1 ring-primary/10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Totals</p>
      <dl className="mt-4 space-y-3">
        <div className="flex items-center justify-between text-sm text-on-surface">
          <dt>Subtotal (ex. VAT)</dt>
          <dd className="font-semibold tabular-nums">{formatCurrency(subtotalExclTax)}</dd>
        </div>
        <div className="flex items-center justify-between text-sm text-on-surface">
          <dt>VAT total</dt>
          <dd className="font-semibold tabular-nums">{formatCurrency(totalVat)}</dd>
        </div>
        <div className="flex items-center justify-between border-t border-border-hairline pt-3 text-base font-semibold text-primary">
          <dt>Total (incl. VAT)</dt>
          <dd className="tabular-nums">{formatCurrency(totalInclTax)}</dd>
        </div>
      </dl>
    </div>
  )
}
