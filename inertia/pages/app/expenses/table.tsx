import type { ExpenseDto } from '~/lib/types'

import { StatusBadge } from '~/components/status_badge'
import { formatShortDate, formatSignedCurrency } from '~/lib/format'

interface ExpenseTableProps {
  items: ExpenseDto[]
  onConfirm: (id: string) => void
  onDelete: (id: string) => void
  processingId: null | string
}

export function ExpenseTable({ items, onConfirm, onDelete, processingId }: ExpenseTableProps) {
  if (items.length === 0) {
    return (
      <div className="px-4 py-8">
        <div className="rounded-lg border border-dashed border-outline-variant/35 bg-surface-container-low px-4 py-5 text-sm text-on-surface-variant">
          No expenses found.
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-outline-variant/15 bg-surface-container-low text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
            <th className="px-4 py-3 font-medium">Label</th>
            <th className="px-4 py-3 font-medium">Category</th>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium text-right">Amount</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/10">
          {items.map((expense) => {
            const rowBusy = processingId === expense.id

            return (
              <tr key={expense.id}>
                <td className="px-4 py-3 font-medium text-on-surface">{expense.label}</td>
                <td className="px-4 py-3 text-on-surface-variant">{expense.category}</td>
                <td className="px-4 py-3 text-on-surface-variant">
                  {formatShortDate(expense.date)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={expense.status} />
                </td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums text-on-surface">
                  {formatSignedCurrency(-expense.amount)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    {expense.canConfirm ? (
                      <button
                        className="rounded border border-primary/20 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={rowBusy}
                        onClick={() => onConfirm(expense.id)}
                        type="button"
                      >
                        Confirm
                      </button>
                    ) : null}
                    {expense.canDelete ? (
                      <button
                        className="rounded border border-error/20 px-3 py-1.5 text-xs font-semibold text-error transition-colors hover:bg-error-container/25 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={rowBusy}
                        onClick={() => onDelete(expense.id)}
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
    </div>
  )
}
