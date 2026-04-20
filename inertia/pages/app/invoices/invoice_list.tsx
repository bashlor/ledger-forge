import { useState } from 'react'

import type { InvoiceDto, InvoiceSummaryDto, PaginatedList } from '~/lib/types'

import { DataTable } from '~/components/data_table'
import { StatusBadge } from '~/components/status_badge'
import { formatCurrency, formatShortDate } from '~/lib/format'
import { canDeleteInvoice } from '~/lib/invoices'

interface Props {
  appliedSearch: string
  deleteConfirmId: null | string
  invoices: PaginatedList<InvoiceDto>
  onCancelDelete: () => void
  onDeleteDraft: (invoice: InvoiceDto) => void
  onPageChange: (page: number) => void
  onPerPageChange: (perPage: number) => void
  onSearchSubmit: (value: string) => void
  onSelectInvoice: (invoice: InvoiceDto) => void
  saving: boolean
  summary: InvoiceSummaryDto | null
}

export function InvoiceList({
  appliedSearch,
  deleteConfirmId,
  invoices,
  onCancelDelete,
  onDeleteDraft,
  onPageChange,
  onPerPageChange,
  onSearchSubmit,
  onSelectInvoice,
  saving,
  summary,
}: Props) {
  const [searchQuery, setSearchQuery] = useState(appliedSearch)
  const draftCount = summary?.draftCount ?? 0
  const issuedCount = summary?.issuedCount ?? 0
  const overdueCount = summary?.overdueCount ?? 0

  return (
    <>
      {summary ? (
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg bg-surface-container-low px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
              Drafts
            </p>
            <p className="mt-1.5 text-2xl font-headline font-extrabold tabular-nums text-on-surface">
              {draftCount}
            </p>
            <p className="mt-0.5 text-xs text-on-surface-variant">Before issue</p>
          </div>
          <div className="rounded-lg bg-surface-container-low px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
              Issued
            </p>
            <p className="mt-1.5 text-2xl font-headline font-extrabold tabular-nums text-on-surface">
              {issuedCount}
            </p>
            <p className="mt-0.5 text-xs text-on-surface-variant">Awaiting payment</p>
          </div>
          <div className="rounded-lg bg-surface-container-low px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
              Overdue
            </p>
            <p className="mt-1.5 text-2xl font-headline font-extrabold tabular-nums text-error">
              {overdueCount}
            </p>
            <p className="mt-0.5 text-xs text-on-surface-variant">Past due date</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {[1, 2, 3].map((key) => (
            <div className="h-24 animate-pulse rounded-lg bg-surface-container-low" key={key} />
          ))}
        </div>
      )}

      <DataTable
        emptyMessage="No invoices fall within the selected period."
        headerContent={
          <form
            className="flex w-full gap-2 sm:w-auto"
            onSubmit={(event) => {
              event.preventDefault()
              onSearchSubmit(searchQuery)
            }}
          >
            <input
              aria-label="Search invoices"
              className="h-9 w-full rounded-lg border border-outline-variant/35 bg-surface px-3 text-sm text-on-surface outline-hidden transition-colors placeholder:text-on-surface-variant/80 focus:border-primary sm:w-64"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search invoice, company, contact"
              type="search"
              value={searchQuery}
            />
            <button
              className="rounded-lg border border-outline-variant/35 px-3 text-sm text-on-surface"
              type="submit"
            >
              Search
            </button>
          </form>
        }
        isEmpty={invoices.items.length === 0}
        onPageChange={onPageChange}
        onPerPageChange={onPerPageChange}
        pagination={invoices.pagination}
        title="Invoice register"
      >
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-outline-variant/15 bg-surface-container-low text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
              <th className="px-4 py-2 font-medium" scope="col">
                Invoice
              </th>
              <th className="px-4 py-2 font-medium" scope="col">
                Customer
              </th>
              <th className="px-4 py-2 font-medium" scope="col">
                Status
              </th>
              <th className="px-4 py-2 font-medium" scope="col">
                Due
              </th>
              <th className="px-4 py-2 text-right font-medium tabular-nums" scope="col">
                Amount <span className="font-normal text-on-surface-variant">(incl. VAT)</span>
              </th>
              <th className="w-px px-2 py-2 text-right" scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {invoices.items.map((invoice) => (
              <tr
                className="cursor-pointer transition-colors hover:bg-surface-container-low/90"
                key={invoice.id}
                onClick={() => onSelectInvoice(invoice)}
              >
                <td className="whitespace-nowrap px-4 py-2 font-medium tabular-nums text-on-surface">
                  {invoice.invoiceNumber}
                </td>
                <td className="max-w-[220px] truncate px-4 py-2 text-on-surface">
                  {invoice.customerCompanyName}
                </td>
                <td className="whitespace-nowrap px-4 py-1.5">
                  <StatusBadge status={invoice.status} />
                </td>
                <td className="whitespace-nowrap px-4 py-2 tabular-nums text-on-surface-variant">
                  {formatShortDate(invoice.dueDate)}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-right font-semibold tabular-nums text-on-surface">
                  {formatCurrency(invoice.totalInclTax)}
                </td>
                <td
                  className="whitespace-nowrap px-2 py-2 text-right"
                  onClick={(event) => event.stopPropagation()}
                >
                  {canDeleteInvoice(invoice) ? (
                    deleteConfirmId === invoice.id ? (
                      <span className="inline-flex items-center gap-1.5">
                        <button
                          aria-label={`Confirm delete draft ${invoice.invoiceNumber}`}
                          className="rounded border border-error px-2 py-1 text-xs font-semibold text-error transition-colors hover:bg-error-container/40 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={saving}
                          onClick={() => onDeleteDraft(invoice)}
                          type="button"
                        >
                          Confirm
                        </button>
                        <button
                          aria-label="Cancel delete"
                          className="rounded border border-outline-variant/35 px-2 py-1 text-xs font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-low"
                          onClick={onCancelDelete}
                          type="button"
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        aria-label={`Delete draft ${invoice.invoiceNumber}`}
                        className="rounded border border-error/20 px-2 py-1 text-xs font-semibold text-error transition-colors hover:bg-error-container/25 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={saving}
                        onClick={() => onDeleteDraft(invoice)}
                        type="button"
                      >
                        Delete draft
                      </button>
                    )
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataTable>
    </>
  )
}
