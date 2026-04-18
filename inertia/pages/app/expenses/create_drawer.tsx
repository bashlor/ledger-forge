import { useState } from 'react'

import type { CreateExpenseInput, ExpenseDto } from '~/lib/types'

import { DrawerPanel } from '~/components/drawer_panel'

interface CreateDrawerProps {
  categories: string[]
  expense?: ExpenseDto | null
  onClose: () => void
  onSubmit: (input: CreateExpenseInput) => void
  open: boolean
  processing: boolean
}

export function CreateDrawer({
  categories,
  expense = null,
  onClose,
  onSubmit,
  open,
  processing,
}: CreateDrawerProps) {
  const [createForm, setCreateForm] = useState<CreateExpenseInput>(() => freshForm(categories))
  const detailsMode = Boolean(expense)
  const confirmedExpense = expense?.status === 'confirmed'
  const fieldDisabled = detailsMode
  const form = detailsMode && expense ? toFormInput(expense) : createForm

  function handleClose() {
    onClose()
    setCreateForm(freshForm(categories))
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (detailsMode) return
    onSubmit(form)
  }

  return (
    <DrawerPanel
      description={
        detailsMode
          ? confirmedExpense
            ? 'Confirmed expenses are locked to preserve accounting integrity.'
            : 'Draft details are shown for review in this panel.'
          : 'Add an expense. It will be created as a draft and can later be confirmed.'
      }
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {confirmedExpense ? (
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
              Confirmed expense (read-only)
            </p>
          ) : null}
          <button
            className="rounded-lg bg-surface-container-highest px-4 py-3 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-high"
            onClick={handleClose}
            type="button"
          >
            {detailsMode ? 'Close' : 'Cancel'}
          </button>
          {detailsMode ? null : (
            <button
              className="rounded-lg px-4 py-3 text-sm font-medium text-on-primary milled-steel-gradient transition-all hover:opacity-95 disabled:opacity-60"
              disabled={processing}
              form="expense-form"
              type="submit"
            >
              {processing ? 'Saving…' : 'Save draft'}
            </button>
          )}
        </div>
      }
      icon="payments"
      onClose={handleClose}
      open={open}
      title={detailsMode ? 'Expense details' : 'Create expense'}
    >
      <form className="space-y-4" id="expense-form" onSubmit={handleSubmit}>
        <div>
          <label
            className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant"
            htmlFor="expense-label"
          >
            Label
          </label>
          <input
            className="w-full rounded-xl border border-outline-variant/35 bg-white px-3 py-3 text-sm text-on-surface outline-hidden transition-colors focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
            disabled={fieldDisabled}
            id="expense-label"
            onChange={(e) => setCreateForm((f) => ({ ...f, label: e.target.value }))}
            required
            type="text"
            value={form.label}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant"
              htmlFor="expense-category"
            >
              Category
            </label>
            <select
              className="w-full rounded-xl border border-outline-variant/35 bg-white px-3 py-3 text-sm text-on-surface outline-hidden transition-colors focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
              disabled={fieldDisabled}
              id="expense-category"
              onChange={(e) => setCreateForm((f) => ({ ...f, category: e.target.value }))}
              value={form.category}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant"
              htmlFor="expense-amount"
            >
              Amount (€)
            </label>
            <input
              className="w-full rounded-xl border border-outline-variant/35 bg-white px-3 py-3 text-sm text-on-surface outline-hidden transition-colors focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
              disabled={fieldDisabled}
              id="expense-amount"
              min="0.01"
              onChange={(e) => setCreateForm((f) => ({ ...f, amount: Number(e.target.value) }))}
              required
              step="0.01"
              type="number"
              value={form.amount}
            />
          </div>

          <div className="sm:col-span-2">
            <label
              className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant"
              htmlFor="expense-date"
            >
              Date
            </label>
            <input
              className="w-full rounded-xl border border-outline-variant/35 bg-white px-3 py-3 text-sm text-on-surface outline-hidden transition-colors focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
              disabled={fieldDisabled}
              id="expense-date"
              onChange={(e) => setCreateForm((f) => ({ ...f, date: e.target.value }))}
              required
              type="date"
              value={form.date}
            />
          </div>
        </div>
      </form>
    </DrawerPanel>
  )
}

function freshForm(categories: string[]): CreateExpenseInput {
  return {
    amount: 0,
    category: categories[0] ?? '',
    date: localISODate(),
    label: '',
  }
}

function localISODate(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function toFormInput(expense: ExpenseDto): CreateExpenseInput {
  return {
    amount: expense.amount,
    category: expense.category,
    date: expense.date,
    label: expense.label,
  }
}
