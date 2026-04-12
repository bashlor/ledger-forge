import type { CustomerSummaryDto } from '~/lib/types'

import { formatCurrency } from '~/lib/format'

interface SummaryCardsProps {
  summary: CustomerSummaryDto
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card caption="Contacts in the system" label="Customers" value={String(summary.totalCount)} />
      <Card
        caption="Customers with at least one invoice"
        label="With invoices"
        value={String(summary.linkedCustomers)}
      />
      <Card
        caption="Excluding drafts"
        label="Total invoiced"
        value={formatCurrency(summary.totalInvoiced)}
      />
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
