import type { CustomerSummaryDto } from '~/lib/types'

import { Eyebrow } from '~/components/ui'
import { formatCurrency } from '~/lib/format'

interface SummaryCardsProps {
  summary: CustomerSummaryDto
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  return (
    <section className="rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3.5 shadow-sm sm:px-5">
      <div className="grid gap-4 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-outline-variant">
        <Metric
          className="sm:pr-5"
          label="Customers"
          value={String(summary.totalCount)}
        />
        <Metric
          className="sm:px-5"
          label="With invoices"
          value={String(summary.linkedCustomers)}
        />
        <Metric
          className="sm:pl-5"
          label="Total invoiced"
          value={formatCurrency(summary.totalInvoiced)}
        />
      </div>
    </section>
  )
}

function Metric({
  className = '',
  label,
  value,
}: {
  className?: string
  label: string
  value: string
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`.trim()}>
      <Eyebrow className="text-[10px] tracking-[0.1em]">{label}</Eyebrow>
      <p className="text-lg font-semibold tabular-nums tracking-tight text-on-surface">{value}</p>
    </div>
  )
}
