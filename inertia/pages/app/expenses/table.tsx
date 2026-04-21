import type { KeyboardEvent } from 'react'

import type { ExpenseDto } from '~/lib/types'

import { StatusBadge } from '~/components/status_badge'
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
    <table className="w-full min-w-[760px] border-collapse text-left text-sm">
      <thead>
        <tr className="border-b border-outline-variant/15 bg-surface-container-low text-xs font-medium tracking-normal text-on-surface-variant">
          <th className="w-[28%] px-4 py-3">Label</th>
          <th className="w-[18%] px-4 py-3">Category</th>
          <th className="w-[14%] px-4 py-3">Date</th>
          <th className="w-[14%] px-4 py-3">Status</th>
          <th className="w-[14%] px-4 py-3 text-right">Amount</th>
          <th className="w-[12%] px-4 py-3 text-center">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-outline-variant/10">
        {items.map((expense) => {
          const rowBusy = processingId === expense.id

          return (
            <tr
              className="cursor-pointer transition-colors hover:bg-surface-container-low/55 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-inset"
              key={expense.id}
              onClick={() => onOpen(expense)}
              onKeyDown={(event) => handleRowKeyDown(event, expense)}
              tabIndex={0}
            >
              <td className="px-4 py-3 font-medium text-on-surface">{expense.label}</td>
              <td className="px-4 py-3 text-on-surface-variant">{expense.category}</td>
              <td className="px-4 py-3 text-on-surface-variant">{formatShortDate(expense.date)}</td>
              <td className="px-4 py-3">
                <StatusBadge status={expense.status} />
              </td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums text-on-surface">
                {formatSignedCurrency(-expense.amount)}
              </td>
              <td className="px-4 py-3 text-center">
                <div className="inline-flex items-center justify-center gap-2">
                  {expense.canConfirm ? (
                    <button
                      className="rounded-lg border border-primary/20 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/35 disabled:cursor-not-allowed disabled:opacity-50"
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
