import type { ExpenseSummaryDto } from '~/lib/types'

import { MetricCard } from '~/components/metric_card'
import { formatCurrency } from '~/lib/format'

interface SummaryCardsProps {
  summary: ExpenseSummaryDto
}

const SKELETON = Array.from({ length: 4 })

export function SummaryCards({ summary }: SummaryCardsProps) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
      <MetricCard
        caption="All registered expenses"
        icon="receipt_long"
        label="Expenses"
        tone="default"
        value={String(summary.totalCount)}
      />
      <MetricCard
        caption="Posted to the ledger"
        icon="task_alt"
        label="Confirmed"
        tone="success"
        value={String(summary.confirmedCount)}
      />
      <MetricCard
        caption="Awaiting confirmation"
        icon="tune"
        label="Drafts"
        tone="default"
        value={String(summary.draftCount)}
      />
      <MetricCard
        caption="Sum of confirmed expenses"
        icon="payments"
        label="Total expenses"
        tone="default"
        value={formatCurrency(summary.totalAmount)}
      />
    </section>
  )
}

export function SummaryCardsSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
      {SKELETON.map((_, i) => (
        <div
          className="h-[7.25rem] animate-pulse rounded-xl border border-slate-200/90 bg-white shadow-md shadow-slate-900/[0.05] ring-1 ring-slate-900/[0.04]"
          key={i}
        />
      ))}
    </div>
  )
}
