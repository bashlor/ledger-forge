import { Head, router } from '@inertiajs/react'
import { useEffect, useRef, useState } from 'react'

import type { CreateExpenseInput, ExpenseDto, ExpenseSummaryDto, PaginatedList } from '~/lib/types'

import { DataTable } from '~/components/data_table'
import { useDateScope } from '~/components/date_scope_provider'
import { Modal } from '~/components/modal'
import { PageHeader } from '~/components/page_header'
import { DEFAULT_PAGE_SIZE } from '~/lib/pagination'

import type { InertiaProps } from '../../types'

import { CreateDrawer } from './expenses/create_drawer'
import { SummaryCards, SummaryCardsSkeleton } from './expenses/summary_cards'
import { ExpenseTable } from './expenses/table'

interface ExpenseSearchFormProps {
  appliedSearch: string
  onSubmit: (searchQuery: string) => void
}

type PendingAction = { id: string; kind: 'confirm' | 'delete'; label: string }

type Props = InertiaProps<{
  categories: string[]
  expenses: PaginatedList<ExpenseDto>
  filters?: { search?: string }
  summary?: ExpenseSummaryDto
}>

export default function ExpensesPage({ categories, expenses, filters, summary }: Props) {
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
    router.post('/expenses', { ...input, ...listQs() } as never, {
      onFinish: () => setProcessing(false),
      onStart: () => setProcessing(true),
      onSuccess: () => setDrawerOpen(false),
      preserveScroll: true,
    })
  }

  function openCreateDrawer() {
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
    const expense = expenses.items.find((e) => e.id === id)
    setPendingAction({ id, kind: 'confirm', label: expense?.label ?? 'this expense' })
  }

  function requestDelete(id: string) {
    const expense = expenses.items.find((e) => e.id === id)
    setPendingAction({ id, kind: 'delete', label: expense?.label ?? 'this expense' })
  }

  function executeAction() {
    if (!pendingAction) return
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
        <PageHeader
          actions={
            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-on-primary shadow-sm milled-steel-gradient transition-all hover:opacity-95 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface active:scale-[0.99] sm:w-auto sm:justify-start"
              onClick={openCreateDrawer}
              type="button"
            >
              New expense
            </button>
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
            <ExpenseSearchForm
              appliedSearch={appliedSearch}
              key={appliedSearch}
              onSubmit={submitSearch}
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
            <button
              className="rounded-lg bg-surface-container-highest px-4 py-2.5 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-high"
              onClick={() => setPendingAction(null)}
              type="button"
            >
              Cancel
            </button>
            <button
              className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                pendingAction?.kind === 'delete'
                  ? 'bg-error text-on-error hover:bg-error/90'
                  : 'text-on-primary milled-steel-gradient hover:opacity-95'
              }`}
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

function ExpenseSearchForm({ appliedSearch, onSubmit }: ExpenseSearchFormProps) {
  const [searchQuery, setSearchQuery] = useState(appliedSearch)

  return (
    <form
      className="flex w-full gap-2 sm:w-auto"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(searchQuery)
      }}
    >
      <input
        aria-label="Search expenses"
        className="h-9 w-full rounded-lg border border-outline-variant/35 bg-surface px-3 text-sm text-on-surface outline-hidden transition-colors placeholder:text-on-surface-variant/80 focus:border-primary sm:w-64"
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder="Search label or category"
        type="search"
        value={searchQuery}
      />
      <button
        className="rounded-lg border border-outline-variant/35 px-3 text-sm text-on-surface"
        type="submit"
      >
        Search
      </button>
    </form>
  )
}
