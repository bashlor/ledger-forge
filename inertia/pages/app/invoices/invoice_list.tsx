import type { InvoiceDto, InvoiceSummaryDto, PaginatedList } from '~/lib/types'

import { DataTable } from '~/components/data_table'
import { SearchForm } from '~/components/search_form'
import { StatusBadge } from '~/components/status_badge'
import { Eyebrow, TableHeaderCell, TableHeadRow } from '~/components/ui'
import { formatCurrency, formatShortDate } from '~/lib/format'
import { canDeleteInvoice } from '~/lib/invoices'

interface Props {
  accountingReadOnly: boolean
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
  accountingReadOnly,
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
  const draftCount = summary?.draftCount ?? 0
  const issuedCount = summary?.issuedCount ?? 0
  const overdueCount = summary?.overdueCount ?? 0

  return (
    <>
      {summary ? (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest px-4 py-4 shadow-sm">
            <Eyebrow className="text-[10px] tracking-[0.14em]">Drafts</Eyebrow>
            <p className="mt-2 text-2xl font-headline font-bold tabular-nums tracking-tight text-on-surface">
              {draftCount}
            </p>
            <p className="mt-1 text-xs text-on-surface-variant">Before issue</p>
          </div>
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest px-4 py-4 shadow-sm">
            <Eyebrow className="text-[10px] tracking-[0.14em]">Issued</Eyebrow>
            <p className="mt-2 text-2xl font-headline font-bold tabular-nums tracking-tight text-on-surface">
              {issuedCount}
            </p>
            <p className="mt-1 text-xs text-on-surface-variant">Awaiting payment</p>
          </div>
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest px-4 py-4 shadow-sm">
            <Eyebrow className="text-[10px] tracking-[0.14em]">Overdue</Eyebrow>
            <p className="mt-2 text-2xl font-headline font-bold tabular-nums tracking-tight text-error">
              {overdueCount}
            </p>
            <p className="mt-1 text-xs text-on-surface-variant">Past due date</p>
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
          <SearchForm
            ariaLabel="Search invoices"
            key={appliedSearch}
            onSubmit={onSearchSubmit}
            placeholder="Search invoice, company, contact"
            value={appliedSearch}
          />
        }
        isEmpty={invoices.items.length === 0}
        onPageChange={onPageChange}
        onPerPageChange={onPerPageChange}
        pagination={invoices.pagination}
        title="Invoice register"
      >
        <table className="tonal-table w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <TableHeadRow>
              <TableHeaderCell>Invoice</TableHeaderCell>
              <TableHeaderCell>Customer</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Due</TableHeaderCell>
              <TableHeaderCell className="text-right tabular-nums">
                Amount <span className="font-normal normal-case tracking-normal text-on-surface-variant">(incl. VAT)</span>
              </TableHeaderCell>
              <TableHeaderCell className="w-px px-2 text-right">
                <span className="sr-only">Actions</span>
              </TableHeaderCell>
            </TableHeadRow>
          </thead>
          <tbody className="divide-y divide-outline-variant/80">
            {invoices.items.map((invoice) => (
              <tr
                className="cursor-pointer transition-colors duration-150 hover:bg-surface-container-low/90"
                key={invoice.id}
                onClick={() => onSelectInvoice(invoice)}
              >
                <td className="whitespace-nowrap px-4 py-3.5 font-medium tabular-nums text-on-surface">
                  {invoice.invoiceNumber}
                </td>
                <td className="max-w-[220px] truncate px-4 py-3.5 text-on-surface">
                  {invoice.customerCompanyName}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <StatusBadge status={invoice.status} />
                </td>
                <td className="whitespace-nowrap px-4 py-3.5 tabular-nums text-on-surface-variant">
                  {formatShortDate(invoice.dueDate)}
                </td>
                <td className="whitespace-nowrap px-4 py-3.5 text-right font-semibold tabular-nums text-on-surface">
                  {formatCurrency(invoice.totalInclTax)}
                </td>
                <td
                  className="whitespace-nowrap px-2 py-3.5 text-right"
                  onClick={(event) => event.stopPropagation()}
                >
                  {canDeleteInvoice(invoice) ? (
                    deleteConfirmId === invoice.id ? (
                      <span className="inline-flex items-center gap-1.5">
                        <button
                          aria-label={`Confirm delete draft ${invoice.invoiceNumber}`}
                          className="rounded border border-error px-2 py-1 text-xs font-semibold text-error transition-colors hover:bg-error-container/40 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={accountingReadOnly || saving}
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
                        disabled={accountingReadOnly || saving}
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
