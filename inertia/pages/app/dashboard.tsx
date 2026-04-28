import { Head } from '@inertiajs/react'
import { useRef } from 'react'

import type { DashboardDto } from '~/lib/types'

import { useDateScope } from '~/components/date_scope_provider'
import { DateScopeSummary } from '~/components/date_scope_summary'
import { MetricCard } from '~/components/metric_card'
import { PageHeader } from '~/components/page_header'
import { StatusBadge } from '~/components/status_badge'
import { TableHeaderCell, TableHeadRow } from '~/components/ui'
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

        <div className="space-y-4">
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

      <div className="space-y-4">
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

        <section className="rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
          <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3.5 sm:px-5">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-on-surface">
                Recent invoices
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">
                Latest issued, paid, or draft invoices.
              </p>
            </div>
          </div>

          {scopedInvoices.length === 0 ? (
            <div className="px-5 py-10 sm:px-6">
              <div className="rounded-xl border border-dashed border-outline-variant bg-surface px-5 py-6 text-sm text-on-surface-variant">
                No recent invoices fall within the selected period.
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-b-xl">
              <table className="tonal-table w-full min-w-[760px] border-collapse text-left text-sm">
                <thead>
                  <TableHeadRow>
                    <TableHeaderCell scope="col">Invoice</TableHeaderCell>
                    <TableHeaderCell scope="col">Client</TableHeaderCell>
                    <TableHeaderCell scope="col">Issued</TableHeaderCell>
                    <TableHeaderCell scope="col">Due</TableHeaderCell>
                    <TableHeaderCell scope="col">Status</TableHeaderCell>
                    <TableHeaderCell className="text-right tabular-nums" scope="col">
                      Total (incl. VAT)
                    </TableHeaderCell>
                  </TableHeadRow>
                </thead>
                <tbody className="divide-y divide-outline-variant/80">
                  {scopedInvoices.map((invoice) => (
                    <tr
                      className="transition-colors duration-150 hover:bg-surface-container-low/90"
                      key={invoice.id}
                    >
                      <td className="whitespace-nowrap px-4 py-3.5 font-medium tabular-nums text-on-surface">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="px-4 py-3.5 text-on-surface">{invoice.customerCompanyName}</td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-on-surface-variant">
                        {formatShortDate(invoice.date)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-on-surface-variant">
                        {formatShortDate(invoice.dueDate)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <StatusBadge status={invoice.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right font-semibold tabular-nums text-on-surface">
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
            className="flex min-h-[118px] animate-pulse flex-col justify-end rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm"
            key={i}
          >
            <div className="mb-3 h-10 w-28 rounded-lg bg-surface-container-high" />
            <div className="h-3 w-20 rounded bg-surface-container-high" />
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
        <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3.5 sm:px-5">
          <div>
            <div className="h-5 w-40 animate-pulse rounded-lg bg-surface-container-high" />
            <div className="mt-2 h-4 w-64 animate-pulse rounded-lg bg-surface-container-high" />
          </div>
        </div>
        <div className="overflow-x-auto rounded-b-xl px-4 py-4 sm:px-5">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-lowest">
                {Array.from({ length: 6 }).map((__, j) => (
                  <th className="px-4 py-3" key={j} scope="col">
                    <div className="h-3 w-16 animate-pulse rounded bg-surface-container-high" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/80">
              {rowPlaceholders.map((_, r) => (
                <tr key={r}>
                  {Array.from({ length: 6 }).map((__, c) => (
                    <td className="px-4 py-3.5" key={c}>
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
