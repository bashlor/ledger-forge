import type { InvoiceDto, InvoiceSummaryDto, PaginatedList } from '~/lib/types'

import { DataTable } from '~/components/data_table'
import { MetricCard } from '~/components/metric_card'
import { SearchForm } from '~/components/search_form'

import { InvoiceTable } from './invoice_table'

interface Props {
  accountingReadOnly: boolean
  appliedSearch: string
  invoices: PaginatedList<InvoiceDto>
  onDeleteDraft: (invoice: InvoiceDto) => void
  onIssueInvoice: (invoice: InvoiceDto) => void
  onPageChange: (page: number) => void
  onPerPageChange: (perPage: number) => void
  onSearchSubmit: (value: string) => void
  onSelectInvoice: (invoice: InvoiceDto) => void
  saving: boolean
  summary: InvoiceSummaryDto | null
}

export function InvoiceList({
  accountingReadOnly,
  appliedSearch,
  invoices,
  onDeleteDraft,
  onIssueInvoice,
  onPageChange,
  onPerPageChange,
  onSearchSubmit,
  onSelectInvoice,
  saving,
  summary,
}: Props) {
  const draftCount = summary?.draftCount ?? 0
  const issuedCount = summary?.issuedCount ?? 0
  const overdueCount = summary?.overdueCount ?? 0

  return (
    <>
      {summary ? (
        <section className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          <MetricCard
            caption="Before issue"
            icon="receipt_long"
            label="Drafts"
            tone="default"
            value={String(draftCount)}
          />
          <MetricCard
            caption="Awaiting payment"
            icon="send"
            label="Issued"
            tone="success"
            value={String(issuedCount)}
          />
          <MetricCard
            caption="Past due date"
            icon="date_range"
            label="Overdue"
            tone="danger"
            value={String(overdueCount)}
          />
        </section>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((key) => (
            <div className="h-24 animate-pulse rounded-xl bg-surface-container-low" key={key} />
          ))}
        </div>
      )}

      <DataTable
        emptyMessage="No invoices fall within the selected period."
        headerClassName="border-b border-slate-200/90 bg-white px-5 py-4 sm:px-6"
        headerContent={
          <SearchForm
            ariaLabel="Search invoices"
            onSubmit={onSearchSubmit}
            placeholder="Search invoice, company, contact"
            value={appliedSearch}
            variant="premium"
          />
        }
        isEmpty={invoices.items.length === 0}
        onPageChange={onPageChange}
        onPerPageChange={onPerPageChange}
        pagination={invoices.pagination}
        panelClassName="overflow-hidden rounded-xl border border-slate-200/95 bg-white shadow-md shadow-slate-900/[0.06] ring-1 ring-slate-900/[0.04]"
        title="Invoice register"
        titleClassName="text-slate-950 lg:text-base"
        toolbarClassName="gap-3"
      >
        <InvoiceTable
          accountingReadOnly={accountingReadOnly}
          invoices={invoices.items}
          onDeleteDraft={onDeleteDraft}
          onIssueInvoice={onIssueInvoice}
          onSelectInvoice={onSelectInvoice}
          saving={saving}
        />
      </DataTable>
    </>
  )
}
