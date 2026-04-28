import type { CustomerSummaryDto } from '~/lib/types'

import { MetricCard } from '~/components/metric_card'
import { formatCurrency } from '~/lib/format'

interface SummaryCardsProps {
  summary: CustomerSummaryDto
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  return (
    <section className="grid gap-3 sm:grid-cols-3 sm:gap-4">
      <MetricCard icon="business" label="Customers" value={String(summary.totalCount)} />
      <MetricCard
        icon="receipt_long"
        label="With invoices"
        value={String(summary.linkedCustomers)}
      />
      <MetricCard
        icon="payments"
        label="Total invoiced"
        value={formatCurrency(summary.totalInvoiced)}
      />
    </section>
  )
}
