import { Head, router } from '@inertiajs/react'
import { useEffect, useRef, useState } from 'react'

import type { CreateExpenseInput, ExpenseDto, ExpenseSummaryDto, PaginatedList } from '~/lib/types'

import { PrimaryButton, SecondaryButton } from '~/components/button'
import { DataTable } from '~/components/data_table'
import { useDateScope } from '~/components/date_scope_provider'
import { ErrorBanner } from '~/components/error_banner'
import { Modal } from '~/components/modal'
import { PageHeader } from '~/components/page_header'
import { SearchForm } from '~/components/search_form'
import { DEFAULT_PAGE_SIZE } from '~/lib/pagination'

import type { InertiaProps } from '../../types'

import { CreateDrawer } from './expenses/create_drawer'
import { SummaryCards, SummaryCardsSkeleton } from './expenses/summary_cards'
import { ExpenseTable } from './expenses/table'

type PendingAction = { id: string; kind: 'confirm' | 'delete'; label: string }

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
  const [selectedExpense, setSelectedExpense] = useState<ExpenseDto | null>(null)
  const [processing, setProcessing] = useState(false)
  const [processingId, setProcessingId] = useState<null | string>(null)
  const [pendingAction, setPendingAction] = useState<null | PendingAction>(null)
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

  function handleCreate(input: CreateExpenseInput) {
    if (accountingReadOnly) return
    router.post('/expenses', { ...input, ...listQs() } as never, {
      onFinish: () => setProcessing(false),
      onStart: () => setProcessing(true),
      onSuccess: () => setDrawerOpen(false),
      preserveScroll: true,
    })
  }

  function openCreateDrawer() {
    if (accountingReadOnly) return
    setSelectedExpense(null)
    setDrawerOpen(true)
  }

  function openExpenseDrawer(expense: ExpenseDto) {
    setSelectedExpense(expense)
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setSelectedExpense(null)
  }

  function requestConfirm(id: string) {
    if (accountingReadOnly) return
    const expense = expenses.items.find((e) => e.id === id)
    setPendingAction({ id, kind: 'confirm', label: expense?.label ?? 'this expense' })
  }

  function requestDelete(id: string) {
    if (accountingReadOnly) return
    const expense = expenses.items.find((e) => e.id === id)
    setPendingAction({ id, kind: 'delete', label: expense?.label ?? 'this expense' })
  }

  function executeAction() {
    if (!pendingAction || accountingReadOnly) return
    const { id, kind } = pendingAction
    setPendingAction(null)

    if (kind === 'confirm') {
      router.post(`/expenses/${id}/confirm-draft`, listQs(), {
        onFinish: () => setProcessingId(null),
        onStart: () => setProcessingId(id),
        preserveScroll: true,
      })
    } else {
      router.delete(`/expenses/${id}`, {
        data: listQs(),
        onFinish: () => setProcessingId(null),
        onStart: () => setProcessingId(id),
        preserveScroll: true,
      })
    }
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
          onClose={closeDrawer}
          onSubmit={handleCreate}
          open={drawerOpen}
          processing={processing}
        />

        <DataTable
          emptyMessage="No expenses found."
          headerContent={
            <SearchForm
              ariaLabel="Search expenses"
              key={appliedSearch}
              onSubmit={submitSearch}
              placeholder="Search label or category"
              value={appliedSearch}
            />
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
          title="Expense register"
        >
          <ExpenseTable
            accountingReadOnly={accountingReadOnly}
            items={expenses.items}
            onConfirm={requestConfirm}
            onDelete={requestDelete}
            onOpen={openExpenseDrawer}
            processingId={processingId}
          />
        </DataTable>
      </div>

      <Modal
        description={
          pendingAction?.kind === 'confirm'
            ? `This will mark "${pendingAction.label}" as confirmed. Confirmed expenses cannot be reverted to draft.`
            : `This will permanently delete the draft "${pendingAction?.label}".`
        }
        footer={
          <>
            <SecondaryButton onClick={() => setPendingAction(null)}>Cancel</SecondaryButton>
            <button
              className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                pendingAction?.kind === 'delete'
                  ? 'bg-error text-on-error hover:bg-error/90'
                  : 'text-on-primary milled-steel-gradient hover:opacity-95'
              }`}
              disabled={accountingReadOnly}
              onClick={executeAction}
              type="button"
            >
              {pendingAction?.kind === 'confirm' ? 'Confirm expense' : 'Delete draft'}
            </button>
          </>
        }
        onClose={() => setPendingAction(null)}
        open={pendingAction !== null}
        size="sm"
        title={pendingAction?.kind === 'confirm' ? 'Confirm expense' : 'Delete draft'}
      >
        <p className="text-sm text-on-surface-variant">This action cannot be undone.</p>
      </Modal>
    </>
  )
}
