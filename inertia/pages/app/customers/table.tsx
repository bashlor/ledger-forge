import type { CustomerListItemDto } from '~/lib/types'

import { SearchHighlight } from '~/components/search_highlight'
import { TableHeaderCell, TableHeadRow } from '~/components/ui'
import { formatCurrency } from '~/lib/format'

import { CustomerRowActionsMenu } from './customer_row_actions_menu'

interface CustomerTableProps {
  canManageCustomers: boolean
  items: CustomerListItemDto[]
  onDelete: (customer: CustomerListItemDto) => void
  onEdit: (customer: CustomerListItemDto) => void
  onView: (customer: CustomerListItemDto) => void
  processing: boolean
  readOnly: boolean
  searchQuery?: string
}

export function CustomerTable({
  canManageCustomers,
  items,
  onDelete,
  onEdit,
  onView,
  processing,
  readOnly,
  searchQuery = '',
}: CustomerTableProps) {
  const canInteract = canManageCustomers && !readOnly

  return (
    <table className="tonal-table customer-register-table w-full min-w-[880px] border-collapse text-left text-sm">
      <thead>
        <TableHeadRow className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          <TableHeaderCell>Company</TableHeaderCell>
          <TableHeaderCell>Contact</TableHeaderCell>
          <TableHeaderCell>Email</TableHeaderCell>
          <TableHeaderCell>Phone</TableHeaderCell>
          <TableHeaderCell className="text-right">Invoices</TableHeaderCell>
          <TableHeaderCell className="text-right">Invoiced</TableHeaderCell>
          <TableHeaderCell className="text-right">Actions</TableHeaderCell>
        </TableHeadRow>
      </thead>
      <tbody className="divide-y divide-slate-200/80">
        {items.map((customer) => (
          <tr
            className={`group transition-colors duration-150 ease-out focus-within:bg-slate-50 ${
              canInteract ? 'cursor-pointer hover:bg-slate-50' : ''
            }`}
            key={customer.id}
            onClick={() => {
              if (canInteract) onEdit(customer)
            }}
            onKeyDown={(event) => {
              if (!canInteract) return
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onEdit(customer)
              }
            }}
            tabIndex={canInteract ? 0 : -1}
          >
            <td className="px-5 py-4 font-medium text-slate-950">
              <div>
                <SearchHighlight query={searchQuery} text={customer.company} />
              </div>
              {customer.note ? (
                <div className="mt-0.5 text-xs leading-snug text-slate-500">
                  <SearchHighlight query={searchQuery} text={customer.note} />
                </div>
              ) : null}
            </td>
            <td className="px-5 py-4 text-slate-900">
              <SearchHighlight query={searchQuery} text={customer.name} />
            </td>
            <td className="px-5 py-4 text-slate-600">
              <SearchHighlight query={searchQuery} text={customer.email} />
            </td>
            <td className="px-5 py-4 text-slate-600">
              <SearchHighlight query={searchQuery} text={customer.phone} />
            </td>
            <td className="px-5 py-4 text-right text-sm font-semibold tabular-nums text-slate-900">
              {customer.invoiceCount}
            </td>
            <td className="px-5 py-4 text-right text-sm font-semibold tabular-nums text-slate-900">
              {formatCurrency(customer.totalInvoiced)}
            </td>
            <td className="px-5 py-4 text-right">
              <div
                className="flex justify-end"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                {canManageCustomers ? (
                  <CustomerRowActionsMenu
                    customer={customer}
                    onDelete={onDelete}
                    onEdit={onEdit}
                    onView={onView}
                    processing={processing}
                    readOnly={readOnly}
                  />
                ) : null}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
