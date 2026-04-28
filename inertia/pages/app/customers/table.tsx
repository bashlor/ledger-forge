import type { CustomerListItemDto } from '~/lib/types'

import { TableHeaderCell, TableHeadRow } from '~/components/ui'
import { formatCurrency } from '~/lib/format'

interface CustomerTableProps {
  canManageCustomers: boolean
  items: CustomerListItemDto[]
  onDelete: (customer: CustomerListItemDto) => void
  onEdit: (customer: CustomerListItemDto) => void
  processing: boolean
  readOnly: boolean
}

export function CustomerTable({
  canManageCustomers,
  items,
  onDelete,
  onEdit,
  processing,
  readOnly,
}: CustomerTableProps) {
  const canInteract = canManageCustomers && !readOnly

  return (
    <table className="tonal-table w-full min-w-[860px] border-collapse text-left text-sm">
      <thead>
        <TableHeadRow>
          <TableHeaderCell>Company</TableHeaderCell>
          <TableHeaderCell>Contact</TableHeaderCell>
          <TableHeaderCell>Email</TableHeaderCell>
          <TableHeaderCell>Phone</TableHeaderCell>
          <TableHeaderCell className="text-right">Invoices</TableHeaderCell>
          <TableHeaderCell className="text-right">Invoiced</TableHeaderCell>
          <TableHeaderCell className="text-right">Actions</TableHeaderCell>
        </TableHeadRow>
      </thead>
      <tbody className="divide-y divide-outline-variant/80">
        {items.map((customer) => (
          <tr
            className={`group transition-colors duration-150 focus-within:bg-surface-container-low/70 ${
              canInteract ? 'cursor-pointer hover:bg-surface-container-low/80' : ''
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
            <td className="px-4 py-3.5 font-medium text-on-surface">
              <div>{customer.company}</div>
              {customer.note ? (
                <div className="text-xs text-on-surface-variant">{customer.note}</div>
              ) : null}
            </td>
            <td className="px-4 py-3.5 text-on-surface">{customer.name}</td>
            <td className="px-4 py-3.5 text-on-surface-variant">{customer.email}</td>
            <td className="px-4 py-3.5 text-on-surface-variant">{customer.phone}</td>
            <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-on-surface">
              {customer.invoiceCount}
            </td>
            <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-on-surface">
              {formatCurrency(customer.totalInvoiced)}
            </td>
            <td className="px-4 py-3.5 text-right">
              <div
                className="flex flex-wrap items-center justify-end gap-2"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                {canManageCustomers ? (
                  <button
                    className="rounded border border-error/20 px-3 py-1.5 text-xs font-semibold text-error transition-colors hover:bg-error-container/25 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={processing || readOnly || customer.canDelete === false}
                    onClick={() => onDelete(customer)}
                    title={customer.deleteBlockReason}
                    type="button"
                  >
                    Delete
                  </button>
                ) : null}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
