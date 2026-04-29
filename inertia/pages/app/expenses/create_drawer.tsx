import { useState } from 'react'

import type { CreateExpenseInput, ExpenseDto } from '~/lib/types'

import { PrimaryButton, SecondaryButton } from '~/components/button'
import { DrawerPanel } from '~/components/drawer_panel'
import { ErrorBanner } from '~/components/error_banner'
import { FormLabel, Select } from '~/components/ui'
import { todayDateOnlyUtc } from '~/lib/date'

const FIELD_CLASS =
  'h-10 min-h-10 w-full rounded-xl border border-border-default bg-white px-3 text-sm text-on-surface shadow-sm outline-hidden ring-1 ring-slate-900/[0.05] transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60'

export type ExpenseDrawerMode = 'create' | 'edit' | 'view'

interface CreateDrawerProps {
  accountingReadOnly: boolean
  accountingReadOnlyMessage: string
  categories: string[]
  expense?: ExpenseDto | null
  mode: ExpenseDrawerMode
  onClose: () => void
  onSubmit: (input: CreateExpenseInput, editingId: null | string) => void
  open: boolean
  processing: boolean
}

export function CreateDrawer({
  accountingReadOnly,
  accountingReadOnlyMessage,
  categories,
  expense = null,
  mode,
  onClose,
  onSubmit,
  open,
  processing,
}: CreateDrawerProps) {
  const formKey = expense?.id ?? 'new'
  const [draft, setDraft] = useState(() => ({
    form: formFromExpense(expense, categories),
    formKey,
  }))
  let form = draft.form
  if (draft.formKey !== formKey) {
    form = formFromExpense(expense, categories)
    setDraft({ form, formKey })
  }

  const editMode = mode === 'edit'
  const viewMode = mode === 'view'
  const confirmedExpense = expense?.status === 'confirmed'
  const fieldDisabled = viewMode || accountingReadOnly

  function setForm(updater: (form: CreateExpenseInput) => CreateExpenseInput) {
    setDraft((current) => ({ ...current, form: updater(current.form) }))
  }

  function handleClose() {
    onClose()
    if (mode === 'create') {
      setDraft({ form: freshForm(categories), formKey: 'new' })
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (viewMode || accountingReadOnly) return
    onSubmit(form, editMode ? (expense?.id ?? null) : null)
  }

  const title =
    mode === 'create'
      ? 'Create expense'
      : editMode
        ? `Edit ${expense?.label ?? 'expense'}`
        : 'Expense details'

  const description =
    mode === 'create'
      ? 'Add an expense. It will be created as a draft and can later be confirmed.'
      : editMode
        ? 'Update this draft before confirming it.'
        : confirmedExpense
          ? 'Confirmed expenses are locked to preserve accounting integrity.'
          : 'Draft details are shown for review in this panel.'

  return (
    <DrawerPanel
      description={description}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
          {confirmedExpense ? (
            <p className="mr-auto text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
              Confirmed expense (read-only)
            </p>
          ) : null}
          <SecondaryButton className="py-3" onClick={handleClose}>
            {viewMode ? 'Close' : 'Cancel'}
          </SecondaryButton>
          {viewMode ? null : (
            <PrimaryButton
              className="py-3"
              disabled={accountingReadOnly || processing}
              form="expense-form"
              type="submit"
            >
              {processing ? 'Saving…' : editMode ? 'Update draft' : 'Save draft'}
            </PrimaryButton>
          )}
        </div>
      }
      icon={editMode ? 'edit' : 'payments'}
      onClose={handleClose}
      open={open}
      panelClassName="border-l border-slate-200/90"
      title={title}
    >
      {accountingReadOnly ? <ErrorBanner message={accountingReadOnlyMessage} /> : null}

      <form className="space-y-5" id="expense-form" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <FormLabel htmlFor="expense-label">Label</FormLabel>
          <input
            className={FIELD_CLASS}
            disabled={fieldDisabled}
            id="expense-label"
            onChange={(event) => setForm((f) => ({ ...f, label: event.target.value }))}
            required={!fieldDisabled}
            type="text"
            value={form.label}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <FormLabel htmlFor="expense-category">Category</FormLabel>
            <Select
              align="end"
              aria-label="Expense category"
              disabled={fieldDisabled}
              id="expense-category"
              onValueChange={(next) => setForm((f) => ({ ...f, category: next }))}
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
                onChange={(event) => setForm((f) => ({ ...f, amount: Number(event.target.value) }))}
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
              onChange={(event) => setForm((f) => ({ ...f, date: event.target.value }))}
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

function formFromExpense(expense: ExpenseDto | null, categories: string[]): CreateExpenseInput {
  if (!expense) return freshForm(categories)
  return {
    amount: expense.amount,
    category: expense.category,
    date: expense.date,
    label: expense.label,
  }
}

function freshForm(categories: string[]): CreateExpenseInput {
  return {
    amount: 0,
    category: categories[0] ?? '',
    date: todayDateOnlyUtc(),
    label: '',
  }
}
