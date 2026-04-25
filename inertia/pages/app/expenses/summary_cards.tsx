import type { ExpenseSummaryDto } from '~/lib/types'

import { Caption, Eyebrow, Panel } from '~/components/ui'
import { formatCurrency } from '~/lib/format'

interface SummaryCardsProps {
  summary: ExpenseSummaryDto
}

const SKELETON = Array.from({ length: 4 })

export function SummaryCards({ summary }: SummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {SKELETON.map((_, i) => (
        <div
          className="animate-pulse rounded-xl border border-outline-variant/15 bg-surface-container-low p-4 shadow-ambient-tight"
          key={i}
        >
          <div className="h-3 w-24 rounded bg-surface-container-high" />
          <div className="mt-4 h-9 w-16 rounded bg-surface-container-high" />
          <div className="mt-2 h-3 w-32 rounded bg-surface-container-high" />
        </div>
      ))}
    </div>
  )
}

function Card({ caption, label, value }: { caption: string; label: string; value: string }) {
  return (
    <Panel as="div" className="bg-surface-container-low p-4">
      <Eyebrow className="tracking-[0.16em]">{label}</Eyebrow>
      <p className="mt-2 text-3xl font-headline font-extrabold leading-tight tabular-nums text-on-surface sm:text-[2rem]">
        {value}
      </p>
      <Caption className="mt-1">{caption}</Caption>
    </Panel>
  )
}
