import { Head, router } from '@inertiajs/react'
import { useEffect, useRef, useState } from 'react'

import type { CreateExpenseInput, ExpenseDto, ExpenseSummaryDto, PaginatedList } from '~/lib/types'

import { ActiveSearchFilter } from '~/components/active_search_filter'
import { PrimaryButton, SecondaryButton } from '~/components/button'
import { DataTable } from '~/components/data_table'
import { useDateScope } from '~/components/date_scope_provider'
import { ErrorBanner } from '~/components/error_banner'
import { Modal } from '~/components/modal'
import { PageHeader } from '~/components/page_header'
import { SearchForm } from '~/components/search_form'
import { DEFAULT_PAGE_SIZE } from '~/lib/pagination'

import type { InertiaProps } from '../../types'

import { CreateDrawer, type ExpenseDrawerMode } from './expenses/create_drawer'
import { SummaryCards, SummaryCardsSkeleton } from './expenses/summary_cards'
import { ExpenseTable } from './expenses/table'

type PendingConfirm = { id: string; label: string }

type Props = InertiaProps<{
  accountingReadOnly: boolean
  accountingReadOnlyMessage: string
  categories: string[]
  expenses: PaginatedList<ExpenseDto>
  filters?: { search?: string }
  summary?: ExpenseSummaryDto
}>

export default function ExpensesPage({
  accountingReadOnly,
  accountingReadOnlyMessage,
  categories,
  expenses,
  filters,
  summary,
}: Props) {
  const { scope } = useDateScope()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<ExpenseDrawerMode>('create')
  const [selectedExpense, setSelectedExpense] = useState<ExpenseDto | null>(null)
  const [processing, setProcessing] = useState(false)
  const [processingId, setProcessingId] = useState<null | string>(null)
  const [pendingConfirm, setPendingConfirm] = useState<null | PendingConfirm>(null)
  const cachedSummary = useRef<ExpenseSummaryDto | null>(null)
  const appliedSearch = filters?.search?.trim() ?? ''

  if (summary) cachedSummary.current = summary

  useEffect(() => {
    const url = new URL(window.location.href)
    if (
      url.searchParams.get('startDate') === scope.startDate &&
      url.searchParams.get('endDate') === scope.endDate
    ) {
      return
    }

    router.get(
      '/expenses',
      {
        endDate: scope.endDate,
        ...(expenses.pagination.perPage !== DEFAULT_PAGE_SIZE
          ? { perPage: expenses.pagination.perPage }
          : {}),
        ...(appliedSearch ? { search: appliedSearch } : {}),
        startDate: scope.startDate,
      },
      { preserveScroll: true, preserveState: true, replace: true }
    )
  }, [scope.endDate, scope.startDate])

  function dateQs() {
    return { endDate: scope.endDate, startDate: scope.startDate }
  }

  function listQs(
    page = expenses.pagination.page,
    perPage = expenses.pagination.perPage,
    search = appliedSearch
  ) {
    return {
      ...dateQs(),
      ...(page > 1 ? { page } : {}),
      ...(perPage !== DEFAULT_PAGE_SIZE ? { perPage } : {}),
      ...(search ? { search } : {}),
    }
  }

  function submitSearch(searchQuery: string) {
    router.get('/expenses', listQs(1, expenses.pagination.perPage, searchQuery.trim()), {
      only: ['expenses', 'summary', 'filters'],
      preserveScroll: true,
      preserveState: true,
      replace: true,
    })
  }

  function clearSearch() {
    submitSearch('')
  }

  function handleSubmit(input: CreateExpenseInput, editingId: null | string) {
    if (accountingReadOnly) return
    const payload = { ...input, ...listQs() } as never
    const options = {
      onFinish: () => setProcessing(false),
      onStart: () => setProcessing(true),
      onSuccess: () => setDrawerOpen(false),
      preserveScroll: true,
    }

    if (editingId) {
      router.put(`/expenses/${editingId}`, payload, options)
    } else {
      router.post('/expenses', payload, options)
    }
  }

  function openCreateDrawer() {
    if (accountingReadOnly) return
    setSelectedExpense(null)
    setDrawerMode('create')
    setDrawerOpen(true)
  }

  function openExpenseDrawer(expense: ExpenseDto) {
    setSelectedExpense(expense)
    setDrawerMode(!accountingReadOnly && expense.canEdit ? 'edit' : 'view')
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setSelectedExpense(null)
    setDrawerMode('create')
  }

  function requestConfirm(id: string) {
    if (accountingReadOnly) return
    const expense = expenses.items.find((e) => e.id === id)
    setPendingConfirm({ id, label: expense?.label ?? 'this expense' })
  }

  function performDelete(expense: ExpenseDto) {
    if (accountingReadOnly) return
    router.delete(`/expenses/${expense.id}`, {
      data: listQs(),
      onFinish: () => setProcessingId(null),
      onStart: () => setProcessingId(expense.id),
      preserveScroll: true,
    })
  }

  function executeConfirmDraft() {
    if (!pendingConfirm || accountingReadOnly) return
    const { id } = pendingConfirm
    setPendingConfirm(null)
    router.post(`/expenses/${id}/confirm-draft`, listQs(), {
      onFinish: () => setProcessingId(null),
      onStart: () => setProcessingId(id),
      preserveScroll: true,
    })
  }

  return (
    <>
      <Head title="Expenses" />

      <div className="space-y-8">
        {accountingReadOnly ? <ErrorBanner message={accountingReadOnlyMessage} /> : null}

        <PageHeader
          actions={
            <PrimaryButton
              className="w-full sm:w-auto"
              disabled={accountingReadOnly}
              onClick={openCreateDrawer}
            >
              New expense
            </PrimaryButton>
          }
          className="sm:gap-4"
          description="Expenses start as drafts, can be confirmed once, and only drafts stay deletable."
          eyebrow="Costs"
          title="Expenses"
        />

        {cachedSummary.current ? (
          <SummaryCards summary={cachedSummary.current} />
        ) : (
          <SummaryCardsSkeleton />
        )}

        <CreateDrawer
          accountingReadOnly={accountingReadOnly}
          accountingReadOnlyMessage={accountingReadOnlyMessage}
          categories={categories}
          expense={selectedExpense}
          mode={drawerMode}
          onClose={closeDrawer}
          onSubmit={handleSubmit}
          open={drawerOpen}
          processing={processing}
        />

        <DataTable
          emptyMessage={
            appliedSearch
              ? `No expenses match "${appliedSearch}" in the selected period.`
              : 'No expenses found.'
          }
          headerClassName="border-b border-slate-200/90 bg-white px-5 py-4 sm:px-6"
          headerContent={
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <SearchForm
                ariaLabel="Search expenses"
                onSubmit={submitSearch}
                placeholder="Search label or category"
                value={appliedSearch}
                variant="premium"
              />
              <ActiveSearchFilter onClear={clearSearch} query={appliedSearch} />
            </div>
          }
          isEmpty={expenses.items.length === 0}
          onPageChange={(page) =>
            router.get('/expenses', listQs(page), {
              only: ['expenses', 'summary', 'filters'],
              preserveScroll: true,
              preserveState: true,
            })
          }
          onPerPageChange={(perPage) =>
            router.get('/expenses', listQs(1, perPage), {
              only: ['expenses', 'summary', 'filters'],
              preserveScroll: true,
              preserveState: true,
              replace: true,
            })
          }
          pagination={expenses.pagination}
          panelClassName="overflow-hidden rounded-xl border border-slate-200/95 bg-white shadow-md shadow-slate-900/[0.06] ring-1 ring-slate-900/[0.04]"
          title="Expense register"
          titleClassName="text-slate-950 lg:text-base"
          toolbarClassName="gap-3"
        >
          <ExpenseTable
            accountingReadOnly={accountingReadOnly}
            items={expenses.items}
            onConfirm={requestConfirm}
            onDelete={performDelete}
            onOpen={openExpenseDrawer}
            processingId={processingId}
            searchQuery={appliedSearch}
          />
        </DataTable>
      </div>

      <Modal
        description={
          pendingConfirm
            ? `This will mark "${pendingConfirm.label}" as confirmed. Confirmed expenses cannot be reverted to draft.`
            : undefined
        }
        footer={
          <>
            <SecondaryButton onClick={() => setPendingConfirm(null)}>Cancel</SecondaryButton>
            <button
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary shadow-sm shadow-primary/20 transition-colors hover:bg-primary-dim disabled:opacity-60"
              disabled={accountingReadOnly}
              onClick={executeConfirmDraft}
              type="button"
            >
              Confirm expense
            </button>
          </>
        }
        onClose={() => setPendingConfirm(null)}
        open={pendingConfirm !== null}
        size="sm"
        title="Confirm expense"
      >
        <p className="text-sm text-on-surface-variant">This action cannot be undone.</p>
      </Modal>
    </>
  )
}
