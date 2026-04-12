import type { ExpenseSummaryDto } from '~/lib/types'

import { formatCurrency } from '~/lib/format'

interface SummaryCardsProps {
  summary: ExpenseSummaryDto
}

const SKELETON = Array.from({ length: 4 })

export function SummaryCards({ summary }: SummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card caption="All registered expenses" label="Expenses" value={String(summary.totalCount)} />
      <Card caption="Confirmed expenses" label="Confirmed" value={String(summary.confirmedCount)} />
      <Card caption="Pending confirmation" label="Drafts" value={String(summary.draftCount)} />
      <Card
        caption="Sum of confirmed expenses"
        label="Total expenses"
        value={formatCurrency(summary.totalAmount)}
      />
    </div>
  )
}

export function SummaryCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {SKELETON.map((_, i) => (
        <div className="rounded-xl bg-surface-container-low p-4 animate-pulse" key={i}>
          <div className="h-3 w-20 rounded bg-surface-container-high" />
          <div className="mt-5 h-8 w-16 rounded bg-surface-container-high" />
          <div className="mt-3 h-3 w-32 rounded bg-surface-container-high" />
        </div>
      ))}
    </div>
  )
}

function Card({ caption, label, value }: { caption: string; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-container-low p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">
        {label}
      </p>
      <p className="mt-3 text-3xl font-headline font-extrabold text-on-surface">{value}</p>
      <p className="mt-1 text-sm text-on-surface-variant">{caption}</p>
    </div>
  )
}
