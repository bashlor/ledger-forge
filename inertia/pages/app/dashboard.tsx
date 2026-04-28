import { Link } from '@adonisjs/inertia/react'
import { Head } from '@inertiajs/react'
import { useRef } from 'react'

import type { DashboardDto } from '~/lib/types'

import { useDateScope } from '~/components/date_scope_provider'
import { DateScopeSummary } from '~/components/date_scope_summary'
import { EmptyState } from '~/components/empty_state'
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

        <div className="space-y-8">
          <PageHeader
            breadcrumb={[{ label: 'Finance' }]}
            description="The dashboard aggregates revenue, cash collected, expenses, and profit, derived from invoices and expenses."
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
          breadcrumb={[{ label: 'Finance' }]}
          description="The dashboard aggregates revenue, cash collected, expenses, and profit, derived from invoices and expenses."
          title="Overview"
        />

        <DateScopeSummary />

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-5">
          <MetricCard
            caption="Issued and paid invoices in this workspace."
            footnote="Workspace totals (not filtered by the period control)."
            icon="receipt_long"
            label="Revenue"
            value={formatCurrency(data.summary.totalRevenue)}
          />
          <MetricCard
            caption="Cash recorded when invoices are marked paid."
            footnote="Workspace totals (not filtered by the period control)."
            icon="payments"
            label="Collected"
            value={formatCurrency(data.summary.totalCollected)}
          />
          <MetricCard
            caption="Confirmed expenses deducted from revenue."
            footnote="Workspace totals (not filtered by the period control)."
            icon="shopping_bag"
            label="Expenses"
            tone="danger"
            value={formatCurrency(data.summary.totalExpenses)}
          />
          <MetricCard
            caption="Revenue minus confirmed expenses."
            footnote="Workspace totals (not filtered by the period control)."
            icon="monitoring"
            label="Profit"
            tone={profitTone}
            value={formatCurrency(data.summary.profit)}
          />
        </section>

        <section className="overflow-hidden rounded-xl border border-outline-variant/90 bg-surface-container-lowest shadow-sm ring-1 ring-slate-900/[0.02]">
          <div className="border-b border-outline-variant/90 px-5 py-5 sm:px-6">
            <h2 className="text-lg font-semibold tracking-tight text-on-surface sm:text-xl">
              Recent invoices
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-on-surface-variant">
              Latest issued, paid, or draft invoices in the selected period.
            </p>
          </div>

          {scopedInvoices.length === 0 ? (
            <EmptyState
              action={
                <Link
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary shadow-sm shadow-primary/20 transition-colors duration-200 hover:bg-primary-dim focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2"
                  href="/invoices"
                >
                  Go to invoices
                </Link>
              }
              icon="receipt_long"
              message={`Nothing in this list for ${scope.label}. Try another month or open Invoices to create or issue one.`}
              title="No invoices in this period"
            />
          ) : (
            <div className="overflow-x-auto">
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
                      <td className="whitespace-nowrap px-5 py-3.5 font-medium tabular-nums text-on-surface">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="px-5 py-3.5 text-on-surface">{invoice.customerCompanyName}</td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-on-surface-variant">
                        {formatShortDate(invoice.date)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-on-surface-variant">
                        {formatShortDate(invoice.dueDate)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <StatusBadge status={invoice.status} />
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right font-semibold tabular-nums text-on-surface">
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
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-5">
        {metricPlaceholders.map((_, i) => (
          <div
            className="flex min-h-[148px] animate-pulse flex-col rounded-xl border border-outline-variant/90 bg-surface-container-lowest p-5 shadow-sm ring-1 ring-slate-900/[0.02]"
            key={i}
          >
            <div className="flex justify-between gap-3">
              <div className="h-3 w-20 rounded bg-surface-container-high" />
              <div className="h-10 w-10 shrink-0 rounded-lg bg-surface-container-high" />
            </div>
            <div className="mt-4 h-9 w-32 rounded-lg bg-surface-container-high" />
            <div className="mt-3 h-3 w-full max-w-[12rem] rounded bg-surface-container-high" />
            <div className="mt-auto space-y-2 pt-5">
              <div className="h-3 w-28 rounded bg-surface-container-high" />
            </div>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-xl border border-outline-variant/90 bg-surface-container-lowest shadow-sm ring-1 ring-slate-900/[0.02]">
        <div className="border-b border-outline-variant/90 px-5 py-5 sm:px-6">
          <div className="h-6 w-44 rounded-lg bg-surface-container-high" />
          <div className="mt-3 h-4 w-72 max-w-full rounded-lg bg-surface-container-high" />
        </div>
        <div className="overflow-x-auto px-5 py-4 sm:px-6">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-lowest">
                {Array.from({ length: 6 }).map((__, j) => (
                  <th className="px-5 py-3" key={j} scope="col">
                    <div className="h-3 w-16 animate-pulse rounded bg-surface-container-high" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/80">
              {rowPlaceholders.map((_, r) => (
                <tr key={r}>
                  {Array.from({ length: 6 }).map((__, c) => (
                    <td className="px-5 py-3.5" key={c}>
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
