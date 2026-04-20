import { Head } from '@inertiajs/react'
import { useRef } from 'react'

import type { DashboardDto } from '~/lib/types'

import { useDateScope } from '~/components/date_scope_provider'
import { DateScopeSummary } from '~/components/date_scope_summary'
import { MetricCard } from '~/components/metric_card'
import { PageHeader } from '~/components/page_header'
import { StatusBadge } from '~/components/status_badge'
import { isDateWithinScope } from '~/lib/date_scope'
import { formatCurrency, formatShortDate } from '~/lib/format'

import type { InertiaProps } from '../../types'

export default function DashboardPage({ dashboard }: InertiaProps<{ dashboard?: DashboardDto }>) {
  const cachedDashboard = useRef<DashboardDto | null>(null)
  if (dashboard) {
    cachedDashboard.current = dashboard
  }
  const data = dashboard ?? cachedDashboard.current

  const { scope } = useDateScope()

  if (!data) {
    return (
      <>
        <Head title="Overview" />

        <div className="space-y-8">
          <PageHeader
            description="The dashboard aggregates revenue, cash collected, expenses, and profit, derived from invoices and expenses."
            eyebrow="Summary"
            title="Overview"
          />

          <DateScopeSummary />

          <DashboardSkeleton />
        </div>
      </>
    )
  }

  const profitTone =
    data.summary.profit > 0 ? 'success' : data.summary.profit < 0 ? 'danger' : 'default'
  const scopedInvoices = data.recentInvoices.filter((invoice) =>
    isDateWithinScope(invoice.date, scope)
  )

  return (
    <>
      <Head title="Overview" />

      <div className="space-y-8">
        <PageHeader
          description="The dashboard aggregates revenue, cash collected, expenses, and profit, derived from invoices and expenses."
          eyebrow="Summary"
          title="Overview"
        />

        <DateScopeSummary />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon="receipt_long"
            label="Revenue"
            value={formatCurrency(data.summary.totalRevenue)}
          />
          <MetricCard
            icon="payments"
            label="Collected"
            value={formatCurrency(data.summary.totalCollected)}
          />
          <MetricCard
            icon="shopping_bag"
            label="Expenses"
            tone="danger"
            value={formatCurrency(data.summary.totalExpenses)}
          />
          <MetricCard
            icon="monitoring"
            label="Profit"
            tone={profitTone}
            value={formatCurrency(data.summary.profit)}
          />
        </section>

        <section className="overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-ambient-tight">
          <div className="flex items-center justify-between border-b border-outline-variant/10 px-4 py-3">
            <div>
              <h2 className="text-base font-semibold text-on-surface">Recent invoices</h2>
              <p className="text-sm text-on-surface-variant">
                Latest issued, paid, or draft invoices.
              </p>
            </div>
          </div>

          {scopedInvoices.length === 0 ? (
            <div className="px-4 py-8">
              <div className="rounded-lg border border-dashed border-outline-variant/35 bg-surface-container-low px-4 py-5 text-sm text-on-surface-variant">
                No recent invoices fall within the selected period.
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-outline-variant/15 bg-surface-container-low text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
                    <th className="px-4 py-3 font-medium" scope="col">
                      Invoice
                    </th>
                    <th className="px-4 py-3 font-medium" scope="col">
                      Client
                    </th>
                    <th className="px-4 py-3 font-medium" scope="col">
                      Issued
                    </th>
                    <th className="px-4 py-3 font-medium" scope="col">
                      Due
                    </th>
                    <th className="px-4 py-3 font-medium" scope="col">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right font-medium tabular-nums" scope="col">
                      Total (incl. VAT)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {scopedInvoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="whitespace-nowrap px-4 py-3 font-medium tabular-nums text-on-surface">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="px-4 py-3 text-on-surface">{invoice.customerCompanyName}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-on-surface-variant">
                        {formatShortDate(invoice.date)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-on-surface-variant">
                        {formatShortDate(invoice.dueDate)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <StatusBadge status={invoice.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-on-surface">
                        {formatCurrency(invoice.totalInclTax)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  )
}

function DashboardSkeleton() {
  const metricPlaceholders = Array.from({ length: 4 })
  const rowPlaceholders = Array.from({ length: 4 })

  return (
    <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricPlaceholders.map((_, i) => (
          <div
            className="flex min-h-[120px] animate-pulse flex-col justify-between rounded-xl border-b-2 border-outline-variant/20 bg-surface-container-lowest p-5 shadow-ambient-tight"
            key={i}
          >
            <div className="h-10 w-28 rounded bg-surface-container-high" />
            <div className="h-3 w-20 rounded bg-surface-container-high" />
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-ambient-tight">
        <div className="flex items-center justify-between border-b border-outline-variant/10 px-4 py-3">
          <div>
            <div className="h-5 w-40 animate-pulse rounded bg-surface-container-high" />
            <div className="mt-2 h-4 w-64 animate-pulse rounded bg-surface-container-high" />
          </div>
        </div>
        <div className="overflow-x-auto px-4 py-4">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-outline-variant/15 bg-surface-container-low">
                {Array.from({ length: 6 }).map((__, j) => (
                  <th className="px-4 py-3" key={j} scope="col">
                    <div className="h-3 w-16 animate-pulse rounded bg-surface-container-high" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {rowPlaceholders.map((_, r) => (
                <tr key={r}>
                  {Array.from({ length: 6 }).map((__, c) => (
                    <td className="px-4 py-3" key={c}>
                      <div className="h-4 w-full max-w-[8rem] animate-pulse rounded bg-surface-container-high" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
