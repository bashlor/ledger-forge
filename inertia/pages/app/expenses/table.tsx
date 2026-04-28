import type { KeyboardEvent } from 'react'

import type { ExpenseDto } from '~/lib/types'

import { StatusBadge } from '~/components/status_badge'
import { TableHeaderCell, TableHeadRow } from '~/components/ui'
import { formatShortDate, formatSignedCurrency } from '~/lib/format'

interface ExpenseTableProps {
  accountingReadOnly: boolean
  items: ExpenseDto[]
  onConfirm: (id: string) => void
  onDelete: (id: string) => void
  onOpen: (expense: ExpenseDto) => void
  processingId: null | string
}

export function ExpenseTable({
  accountingReadOnly,
  items,
  onConfirm,
  onDelete,
  onOpen,
  processingId,
}: ExpenseTableProps) {
  function handleRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, expense: ExpenseDto) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onOpen(expense)
    }
  }

  return (
    <table className="tonal-table w-full min-w-[760px] border-collapse text-left text-sm">
      <thead>
        <TableHeadRow className="text-xs normal-case tracking-normal">
          <TableHeaderCell className="w-[28%] py-3">Label</TableHeaderCell>
          <TableHeaderCell className="w-[18%] py-3">Category</TableHeaderCell>
          <TableHeaderCell className="w-[14%] py-3">Date</TableHeaderCell>
          <TableHeaderCell className="w-[14%] py-3">Status</TableHeaderCell>
          <TableHeaderCell className="w-[14%] py-3 text-right">Amount</TableHeaderCell>
          <TableHeaderCell className="w-[12%] py-3 text-center">Actions</TableHeaderCell>
        </TableHeadRow>
      </thead>
      <tbody className="divide-y divide-outline-variant/80">
        {items.map((expense) => {
          const rowBusy = processingId === expense.id

          return (
            <tr
              className="cursor-pointer transition-colors duration-150 hover:bg-surface-container-low/80 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-inset"
              key={expense.id}
              onClick={() => onOpen(expense)}
              onKeyDown={(event) => handleRowKeyDown(event, expense)}
              tabIndex={0}
            >
              <td className="px-4 py-3.5 font-medium text-on-surface">{expense.label}</td>
              <td className="px-4 py-3.5 text-on-surface-variant">{expense.category}</td>
              <td className="px-4 py-3.5 text-on-surface-variant">{formatShortDate(expense.date)}</td>
              <td className="px-4 py-3.5">
                <StatusBadge status={expense.status} />
              </td>
              <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-on-surface">
                {formatSignedCurrency(-expense.amount)}
              </td>
              <td className="px-4 py-3.5 text-center">
                <div className="inline-flex items-center justify-center gap-2">
                  {expense.canConfirm ? (
                    <button
                      className="rounded-lg border border-primary/25 bg-primary-container/40 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary-container focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/35 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={accountingReadOnly || rowBusy}
                      onClick={(event) => {
                        event.stopPropagation()
                        onConfirm(expense.id)
                      }}
                      type="button"
                    >
                      Confirm
                    </button>
                  ) : null}
                  {expense.canDelete ? (
                    <button
                      className="rounded-lg border border-error/20 px-3 py-1.5 text-xs font-semibold text-error transition-colors hover:bg-error-container/25 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-error/35 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={accountingReadOnly || rowBusy}
                      onClick={(event) => {
                        event.stopPropagation()
                        onDelete(expense.id)
                      }}
                      type="button"
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
