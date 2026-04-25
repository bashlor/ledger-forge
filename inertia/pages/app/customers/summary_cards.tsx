import type { CustomerSummaryDto } from '~/lib/types'

import { Eyebrow } from '~/components/ui'
import { formatCurrency } from '~/lib/format'

interface SummaryCardsProps {
  summary: CustomerSummaryDto
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-outline-variant/20 bg-surface-container-lowest px-4 py-2.5">
      <Metric label="Customers" value={String(summary.totalCount)} />
      <Metric label="With invoices" value={String(summary.linkedCustomers)} />
      <Metric label="Total invoiced" value={formatCurrency(summary.totalInvoiced)} />
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <Eyebrow>{label}</Eyebrow>
      <p className="text-sm font-bold tabular-nums text-on-surface">{value}</p>
    </div>
  )
}
