import type { InvoiceDto } from '~/lib/types'

import { SearchHighlight } from '~/components/search_highlight'
import { StatusBadge } from '~/components/status_badge'
import { TableHeaderCell, TableHeadRow } from '~/components/ui'
import { formatCurrency, formatShortDate } from '~/lib/format'
import { invoiceDisplayStatus } from '~/lib/invoices'

import { InvoiceRowActionsMenu } from './invoice_row_actions_menu'

interface InvoiceTableProps {
  accountingReadOnly: boolean
  invoices: InvoiceDto[]
  onDeleteDraft: (invoice: InvoiceDto) => void
  onIssueInvoice: (invoice: InvoiceDto) => void
  onSelectInvoice: (invoice: InvoiceDto) => void
  saving: boolean
  searchQuery?: string
}

export function InvoiceTable({
  accountingReadOnly,
  invoices,
  onDeleteDraft,
  onIssueInvoice,
  onSelectInvoice,
  saving,
  searchQuery = '',
}: InvoiceTableProps) {
  const canInteract = !accountingReadOnly

  return (
    <table className="tonal-table invoice-register-table w-full min-w-[640px] border-collapse text-left text-sm">
      <thead>
        <TableHeadRow className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          <TableHeaderCell className="cursor-default text-left select-none">
            Invoice
          </TableHeaderCell>
          <TableHeaderCell className="cursor-default text-left select-none">
            Customer
          </TableHeaderCell>
          <TableHeaderCell className="cursor-default text-left select-none">Status</TableHeaderCell>
          <TableHeaderCell className="cursor-default text-left select-none">Due</TableHeaderCell>
          <TableHeaderCell className="cursor-default select-none text-right tabular-nums">
            Amount{' '}
            <span className="font-normal normal-case tracking-normal text-slate-500">
              (incl. VAT)
            </span>
          </TableHeaderCell>
          <TableHeaderCell className="w-px cursor-default px-2 text-right select-none">
            <span className="sr-only">Actions</span>
          </TableHeaderCell>
        </TableHeadRow>
      </thead>
      <tbody className="divide-y divide-slate-200/80">
        {invoices.map((invoice) => (
          <tr
            className={`group transition-colors duration-150 ease-out focus-within:bg-slate-50 ${
              canInteract ? 'cursor-pointer hover:bg-slate-50' : ''
            }`}
            key={invoice.id}
            onClick={() => {
              if (canInteract) onSelectInvoice(invoice)
            }}
            onKeyDown={(event) => {
              if (!canInteract) return
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelectInvoice(invoice)
              }
            }}
            tabIndex={canInteract ? 0 : -1}
          >
            <td className="whitespace-nowrap px-5 py-4 font-medium tabular-nums text-slate-950">
              <SearchHighlight query={searchQuery} text={invoice.invoiceNumber} />
            </td>
            <td className="max-w-[220px] truncate px-5 py-4 text-slate-900">
              <SearchHighlight query={searchQuery} text={invoice.customerCompanyName} />
            </td>
            <td className="whitespace-nowrap px-5 py-4">
              <StatusBadge status={invoiceDisplayStatus(invoice)} />
            </td>
            <td className="whitespace-nowrap px-5 py-4 tabular-nums text-slate-600">
              {formatShortDate(invoice.dueDate)}
            </td>
            <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold tabular-nums text-slate-950">
              {formatCurrency(invoice.totalInclTax)}
            </td>
            <td className="whitespace-nowrap px-2 py-4 text-right">
              <div
                className="flex justify-end"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <InvoiceRowActionsMenu
                  invoice={invoice}
                  onDelete={onDeleteDraft}
                  onEdit={onSelectInvoice}
                  onIssue={onIssueInvoice}
                  onOpen={onSelectInvoice}
                  processing={saving}
                  readOnly={accountingReadOnly}
                />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
