import { formatCurrency } from '~/lib/format'

interface Props {
  subtotalExclTax: number
  totalInclTax: number
  totalVat: number
}

const rowClass = 'flex items-baseline justify-between gap-6 text-sm text-on-surface'

export function InvoiceTotals({ subtotalExclTax, totalInclTax, totalVat }: Props) {
  return (
    <div className="rounded-2xl border border-primary/15 bg-gradient-to-b from-primary/[0.06] to-primary/[0.03] p-5 shadow-sm ring-1 ring-primary/10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Totals</p>
      <dl className="mt-4 space-y-0">
        <div className={`${rowClass} pb-3`}>
          <dt className="text-on-surface-variant">Subtotal (ex. VAT)</dt>
          <dd className="text-right text-[15px] font-semibold tabular-nums text-on-surface">
            {formatCurrency(subtotalExclTax)}
          </dd>
        </div>
        <div className="border-t border-primary/10 py-3">
          <div className={rowClass}>
            <dt className="text-on-surface-variant">VAT total</dt>
            <dd className="text-right text-[15px] font-semibold tabular-nums text-on-surface">
              {formatCurrency(totalVat)}
            </dd>
          </div>
        </div>
        <div className="border-t border-primary/20 pt-4">
          <div className="flex items-baseline justify-between gap-6">
            <dt className="text-base font-semibold text-primary">Total (incl. VAT)</dt>
            <dd className="text-right text-xl font-bold tabular-nums tracking-tight text-primary">
              {formatCurrency(totalInclTax)}
            </dd>
          </div>
        </div>
      </dl>
    </div>
  )
}
