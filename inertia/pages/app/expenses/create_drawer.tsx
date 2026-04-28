import { useState } from 'react'

import type { CreateExpenseInput, ExpenseDto } from '~/lib/types'

import { PrimaryButton, SecondaryButton } from '~/components/button'
import { DrawerPanel } from '~/components/drawer_panel'
import { ErrorBanner } from '~/components/error_banner'
import { FormField } from '~/components/form_field'
import { Select } from '~/components/ui'
import { todayDateOnlyUtc } from '~/lib/date'

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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {confirmedExpense ? (
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
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
      title={detailsMode ? 'Expense details' : 'Create expense'}
    >
      {accountingReadOnly ? <ErrorBanner message={accountingReadOnlyMessage} /> : null}

      <form className="space-y-4" id="expense-form" onSubmit={handleSubmit}>
        <FormField
          disabled={fieldDisabled}
          id="expense-label"
          label="Label"
          onChange={(value) => setCreateForm((f) => ({ ...f, label: value }))}
          required
          value={form.label}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant"
              htmlFor="expense-category"
            >
              Category
            </label>
            <Select
              aria-label="Expense category"
              disabled={fieldDisabled}
              id="expense-category"
              onValueChange={(next) => setCreateForm((f) => ({ ...f, category: next }))}
              options={categories.map((c) => ({ label: c, value: c }))}
              tone="surface"
              value={form.category}
            />
          </div>

          <FormField
            disabled={fieldDisabled}
            id="expense-amount"
            label="Amount (€)"
            min="0.01"
            onChange={(value) => setCreateForm((f) => ({ ...f, amount: Number(value) }))}
            required
            step="0.01"
            type="number"
            value={form.amount}
          />

          <div className="sm:col-span-2">
            <FormField
              disabled={fieldDisabled}
              id="expense-date"
              label="Date"
              onChange={(value) => setCreateForm((f) => ({ ...f, date: value }))}
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
