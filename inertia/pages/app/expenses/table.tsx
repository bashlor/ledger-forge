import type { KeyboardEvent } from 'react'

import type { ExpenseDto } from '~/lib/types'

import { StatusBadge } from '~/components/status_badge'
import { TableHeaderCell, TableHeadRow } from '~/components/ui'
import { formatShortDate, formatSignedCurrency } from '~/lib/format'

import { ExpenseRowActionsMenu } from './expense_row_actions_menu'

interface ExpenseTableProps {
  accountingReadOnly: boolean
  items: ExpenseDto[]
  onConfirm: (id: string) => void
  onDelete: (expense: ExpenseDto) => void
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
  const canInteract = !accountingReadOnly

  function handleRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, expense: ExpenseDto) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onOpen(expense)
    }
  }

  return (
    <table className="tonal-table expense-register-table w-full min-w-[760px] border-collapse text-left text-sm">
      <thead>
        <TableHeadRow className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          <TableHeaderCell className="w-[28%] cursor-default py-3 select-none">Label</TableHeaderCell>
          <TableHeaderCell className="w-[18%] cursor-default py-3 select-none">Category</TableHeaderCell>
          <TableHeaderCell className="w-[14%] cursor-default py-3 select-none">Date</TableHeaderCell>
          <TableHeaderCell className="w-[14%] cursor-default py-3 select-none">Status</TableHeaderCell>
          <TableHeaderCell className="w-[14%] cursor-default py-3 text-right select-none tabular-nums">
            Amount
          </TableHeaderCell>
          <TableHeaderCell className="w-px cursor-default px-2 py-3 text-right select-none">
            <span className="sr-only">Actions</span>
          </TableHeaderCell>
        </TableHeadRow>
      </thead>
      <tbody className="divide-y divide-slate-200/80">
        {items.map((expense) => {
          const rowBusy = processingId === expense.id

          return (
            <tr
              className={`group transition-colors duration-150 ease-out focus-within:bg-slate-50 ${
                canInteract ? 'cursor-pointer hover:bg-slate-50' : ''
              }`}
              key={expense.id}
              onClick={() => {
                if (canInteract) onOpen(expense)
              }}
              onKeyDown={(event) => handleRowKeyDown(event, expense)}
              tabIndex={canInteract ? 0 : -1}
            >
              <td className="px-5 py-4 font-medium text-slate-950">{expense.label}</td>
              <td className="px-5 py-4 text-slate-700">{expense.category}</td>
              <td className="px-5 py-4 tabular-nums text-slate-600">{formatShortDate(expense.date)}</td>
              <td className="px-5 py-4">
                <StatusBadge status={expense.status} />
              </td>
              <td className="px-5 py-4 text-right text-sm font-semibold tabular-nums text-slate-900">
                {formatSignedCurrency(-expense.amount)}
              </td>
              <td className="whitespace-nowrap px-2 py-4 text-right">
                <div
                  className="flex justify-end"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <ExpenseRowActionsMenu
                    expense={expense}
                    onConfirm={onConfirm}
                    onDelete={onDelete}
                    onOpen={onOpen}
                    processing={rowBusy}
                    readOnly={accountingReadOnly}
                  />
                </div>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
