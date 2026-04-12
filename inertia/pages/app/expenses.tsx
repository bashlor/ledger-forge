import { Head, router } from '@inertiajs/react'
import { useState } from 'react'

import type { CreateExpenseInput, ExpenseListDto } from '~/lib/types'

import { DateScopeSummary } from '~/components/date_scope_summary'
import { useDateScope } from '~/components/date_scope_provider'
import { DrawerPanel } from '~/components/drawer_panel'
import { PageHeader } from '~/components/page_header'
import { StatusBadge } from '~/components/status_badge'
import { isDateWithinScope } from '~/lib/date_scope'
import { formatCurrency, formatShortDate, formatSignedCurrency } from '~/lib/format'

import type { InertiaProps } from '../../types'

const expenseCategories = [
  'Software',
  'Infrastructure',
  'Office',
  'Travel',
  'Services',
  'Other',
]

export default function ExpensesPage({
  expenses,
}: InertiaProps<{ expenses: ExpenseListDto }>) {
  const { scope } = useDateScope()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState<CreateExpenseInput>(createInitialForm())
  const [processing, setProcessing] = useState(false)
  const [processingId, setProcessingId] = useState<null | string>(null)

  function closeDrawer() {
    setDrawerOpen(false)
    setForm(createInitialForm())
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    router.post('/expenses', form as never, {
      onFinish: () => setProcessing(false),
      onStart: () => setProcessing(true),
      onSuccess: () => closeDrawer(),
      preserveScroll: true,
    })
  }

  function handleConfirm(id: string) {
    router.post(
      `/expenses/${id}/confirm`,
      { page: expenses.pagination.page },
      {
        onFinish: () => setProcessingId(null),
        onStart: () => setProcessingId(id),
        preserveScroll: true,
      }
    )
  }

  function handleDelete(id: string) {
    if (!window.confirm('Delete this draft expense?')) return

    router.delete(`/expenses/${id}`, {
      data: { page: expenses.pagination.page },
      onFinish: () => setProcessingId(null),
      onStart: () => setProcessingId(id),
      preserveScroll: true,
    })
  }

  function visitPage(page: number) {
    router.get('/expenses', { page }, { preserveScroll: true })
  }

  const from = expenses.pagination.totalItems === 0 ? 0 : (expenses.pagination.page - 1) * expenses.pagination.perPage + 1
  const to = Math.min(
    expenses.pagination.page * expenses.pagination.perPage,
    expenses.pagination.totalItems
  )
  const scopedExpenses = expenses.items.filter((expense) => isDateWithinScope(expense.date, scope))
  const scopedSummary = {
    confirmedCount: scopedExpenses.filter((expense) => expense.status === 'confirmed').length,
    draftCount: scopedExpenses.filter((expense) => expense.status === 'draft').length,
    totalAmount: scopedExpenses
      .filter((expense) => expense.status === 'confirmed')
      .reduce((sum, expense) => sum + expense.amount, 0),
    totalCount: scopedExpenses.length,
  }

  return (
    <>
      <Head title="Expenses" />

      <div className="space-y-8">
        <PageHeader
          actions={
            <button
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-on-primary shadow-sm milled-steel-gradient transition-all hover:opacity-95"
              onClick={() => setDrawerOpen(true)}
              type="button"
            >
              New expense
            </button>
          }
          description="Expenses start as drafts, can be confirmed once, and only drafts stay deletable."
          eyebrow="Costs"
          title="Expenses"
        />

        <DateScopeSummary />

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl bg-surface-container-low p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">
              Expenses
            </p>
            <p className="mt-3 text-3xl font-headline font-extrabold text-on-surface">
              {scopedSummary.totalCount}
            </p>
            <p className="mt-1 text-sm text-on-surface-variant">Visible on the current page</p>
          </div>
          <div className="rounded-xl bg-surface-container-low p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">
              Confirmed
            </p>
            <p className="mt-3 text-3xl font-headline font-extrabold text-on-surface">
              {scopedSummary.confirmedCount}
            </p>
            <p className="mt-1 text-sm text-on-surface-variant">Confirmed in the selected period</p>
          </div>
          <div className="rounded-xl bg-surface-container-low p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">
              Drafts
            </p>
            <p className="mt-3 text-3xl font-headline font-extrabold text-on-surface">
              {scopedSummary.draftCount}
            </p>
            <p className="mt-1 text-sm text-on-surface-variant">Drafts in the selected period</p>
          </div>
          <div className="rounded-xl bg-surface-container-low p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">
              Total expenses
            </p>
            <p className="mt-3 text-3xl font-headline font-extrabold text-on-surface">
              {formatCurrency(scopedSummary.totalAmount)}
            </p>
            <p className="mt-1 text-sm text-on-surface-variant">Confirmed entries visible in scope</p>
          </div>
        </div>

        <DrawerPanel
          description="Add an expense. It will be created as a draft and can later be confirmed."
          footer={
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                className="rounded-lg bg-surface-container-highest px-4 py-3 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-high"
                onClick={closeDrawer}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-lg px-4 py-3 text-sm font-medium text-on-primary milled-steel-gradient transition-all hover:opacity-95 disabled:opacity-60"
                disabled={processing}
                form="expense-form"
                type="submit"
              >
                {processing ? 'Saving…' : 'Save draft'}
              </button>
            </div>
          }
          icon="payments"
          onClose={closeDrawer}
          open={drawerOpen}
          title="Create expense"
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
                className="w-full rounded-xl border border-outline-variant/35 bg-white px-3 py-3 text-sm text-on-surface outline-hidden transition-colors focus:border-primary"
                id="expense-label"
                onChange={(event) =>
                  setForm((current) => ({ ...current, label: event.target.value }))
                }
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
                  className="w-full rounded-xl border border-outline-variant/35 bg-white px-3 py-3 text-sm text-on-surface outline-hidden transition-colors focus:border-primary"
                  id="expense-category"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, category: event.target.value }))
                  }
                  value={form.category}
                >
                  {expenseCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
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
                  className="w-full rounded-xl border border-outline-variant/35 bg-white px-3 py-3 text-sm text-on-surface outline-hidden transition-colors focus:border-primary"
                  id="expense-amount"
                  min="0"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, amount: Number(event.target.value) }))
                  }
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
                  className="w-full rounded-xl border border-outline-variant/35 bg-white px-3 py-3 text-sm text-on-surface outline-hidden transition-colors focus:border-primary"
                  id="expense-date"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, date: event.target.value }))
                  }
                  required
                  type="date"
                  value={form.date}
                />
              </div>
            </div>
          </form>
        </DrawerPanel>

        <section className="overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-ambient-tight">
          <div className="border-b border-outline-variant/10 px-4 py-3">
            <h2 className="text-base font-semibold text-on-surface">Expense register</h2>
          </div>

          {scopedExpenses.length === 0 ? (
            <div className="px-4 py-8">
              <div className="rounded-lg border border-dashed border-outline-variant/35 bg-surface-container-low px-4 py-5 text-sm text-on-surface-variant">
                No expenses on this page fall within the selected period.
              </div>
            </div>
          ) : (
            <>
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
                    {scopedExpenses.map((expense) => {
                      const rowProcessing = processingId === expense.id

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
                                  disabled={rowProcessing}
                                  onClick={() => handleConfirm(expense.id)}
                                  type="button"
                                >
                                  Confirm
                                </button>
                              ) : null}
                              {expense.canDelete ? (
                                <button
                                  className="rounded border border-error/20 px-3 py-1.5 text-xs font-semibold text-error transition-colors hover:bg-error-container/25 disabled:cursor-not-allowed disabled:opacity-50"
                                  disabled={rowProcessing}
                                  onClick={() => handleDelete(expense.id)}
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

              <div className="flex flex-col gap-3 border-t border-outline-variant/10 px-4 py-3 text-sm text-on-surface-variant sm:flex-row sm:items-center sm:justify-between">
                <p>
                  Showing {scopedExpenses.length} row{scopedExpenses.length === 1 ? '' : 's'} in scope ·{' '}
                  {from}–{to} of {expenses.pagination.totalItems} · Page {expenses.pagination.page} /{' '}
                  {expenses.pagination.totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-lg border border-outline-variant/20 px-3 py-2 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={expenses.pagination.page <= 1}
                    onClick={() => visitPage(expenses.pagination.page - 1)}
                    type="button"
                  >
                    Previous
                  </button>
                  <button
                    className="rounded-lg border border-outline-variant/20 px-3 py-2 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={expenses.pagination.page >= expenses.pagination.totalPages}
                    onClick={() => visitPage(expenses.pagination.page + 1)}
                    type="button"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </>
  )
}

function createInitialForm(): CreateExpenseInput {
  return {
    amount: 0,
    category: expenseCategories[0],
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
