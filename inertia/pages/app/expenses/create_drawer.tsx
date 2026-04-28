import { useState } from 'react'

import type { CreateExpenseInput, ExpenseDto } from '~/lib/types'

import { PrimaryButton, SecondaryButton } from '~/components/button'
import { DrawerPanel } from '~/components/drawer_panel'
import { ErrorBanner } from '~/components/error_banner'
import { FormLabel, Select } from '~/components/ui'
import { todayDateOnlyUtc } from '~/lib/date'

const FIELD_CLASS =
  'h-10 min-h-10 w-full rounded-xl border border-border-default bg-white px-3 text-sm text-on-surface shadow-sm outline-hidden ring-1 ring-slate-900/[0.05] transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60'

interface CreateDrawerProps {
  accountingReadOnly: boolean
  accountingReadOnlyMessage: string
  categories: string[]
  expense?: ExpenseDto | null
  onClose: () => void
  onSubmit: (input: CreateExpenseInput) => void
  open: boolean
  processing: boolean
}

export function CreateDrawer({
  accountingReadOnly,
  accountingReadOnlyMessage,
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
  const fieldDisabled = detailsMode || accountingReadOnly
  const form = detailsMode && expense ? toFormInput(expense) : createForm

  function handleClose() {
    onClose()
    setCreateForm(freshForm(categories))
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (detailsMode || accountingReadOnly) return
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
          {confirmedExpense ? (
            <p className="mr-auto text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
              Confirmed expense (read-only)
            </p>
          ) : null}
          <SecondaryButton className="py-3" onClick={handleClose}>
            {detailsMode ? 'Close' : 'Cancel'}
          </SecondaryButton>
          {detailsMode ? null : (
            <PrimaryButton
              className="py-3"
              disabled={accountingReadOnly || processing}
              form="expense-form"
              type="submit"
            >
              {processing ? 'Saving…' : 'Save draft'}
            </PrimaryButton>
          )}
        </div>
      }
      icon="payments"
      onClose={handleClose}
      open={open}
      panelClassName="border-l border-slate-200/90"
      title={detailsMode ? 'Expense details' : 'Create expense'}
    >
      {accountingReadOnly ? <ErrorBanner message={accountingReadOnlyMessage} /> : null}

      <form className="space-y-5" id="expense-form" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <FormLabel htmlFor="expense-label">Label</FormLabel>
          <input
            className={FIELD_CLASS}
            disabled={fieldDisabled}
            id="expense-label"
            onChange={(event) => setCreateForm((f) => ({ ...f, label: event.target.value }))}
            required={!fieldDisabled}
            type="text"
            value={form.label}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <FormLabel htmlFor="expense-category">Category</FormLabel>
            <Select
              aria-label="Expense category"
              disabled={fieldDisabled}
              id="expense-category"
              onValueChange={(next) => setCreateForm((f) => ({ ...f, category: next }))}
              options={categories.map((c) => ({ label: c, value: c }))}
              tone="surface"
              triggerClassName="h-10 min-h-10 py-0 text-sm font-medium"
              value={form.category}
            />
          </div>

          <div className="space-y-2">
            <FormLabel htmlFor="expense-amount">Amount</FormLabel>
            <div
              className={`flex h-10 min-h-10 items-stretch overflow-hidden rounded-xl border border-border-default bg-white shadow-sm ring-1 ring-slate-900/[0.05] transition-colors duration-150 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 ${
                fieldDisabled ? 'opacity-60' : ''
              }`}
            >
              <input
                className="min-w-0 flex-1 border-0 bg-transparent px-3 text-sm tabular-nums text-on-surface outline-none disabled:cursor-not-allowed"
                disabled={fieldDisabled}
                id="expense-amount"
                min="0.01"
                onChange={(event) =>
                  setCreateForm((f) => ({ ...f, amount: Number(event.target.value) }))
                }
                required={!fieldDisabled}
                step="0.01"
                type="number"
                value={form.amount}
              />
              <span className="flex shrink-0 items-center border-l border-border-default bg-slate-50/90 px-3 text-sm font-medium text-slate-500">
                €
              </span>
            </div>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <FormLabel htmlFor="expense-date">Date</FormLabel>
            <input
              className={FIELD_CLASS}
              disabled={fieldDisabled}
              id="expense-date"
              onChange={(event) => setCreateForm((f) => ({ ...f, date: event.target.value }))}
              required={!fieldDisabled}
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
    date: todayDateOnlyUtc(),
    label: '',
  }
}

function toFormInput(expense: ExpenseDto): CreateExpenseInput {
  return {
    amount: expense.amount,
    category: expense.category,
    date: expense.date,
    label: expense.label,
  }
}
