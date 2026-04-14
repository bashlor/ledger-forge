import { Head, router } from '@inertiajs/react'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { CreateExpenseInput, ExpenseDto, ExpenseSummaryDto, PaginatedList } from '~/lib/types'

import { DataTable } from '~/components/data_table'
import { useDateScope } from '~/components/date_scope_provider'
import { Modal } from '~/components/modal'
import { PageHeader } from '~/components/page_header'

import type { InertiaProps } from '../../types'

import { CreateDrawer } from './expenses/create_drawer'
import { SummaryCards, SummaryCardsSkeleton } from './expenses/summary_cards'
import { ExpenseTable } from './expenses/table'

type PendingAction = { id: string; kind: 'confirm' | 'delete'; label: string }

type Props = InertiaProps<{
  expenses: PaginatedList<ExpenseDto>
  summary?: ExpenseSummaryDto
}>

export default function ExpensesPage({ expenses, summary }: Props) {
  const { scope } = useDateScope()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [processingId, setProcessingId] = useState<null | string>(null)
  const [pendingAction, setPendingAction] = useState<null | PendingAction>(null)
  const cachedSummary = useRef<ExpenseSummaryDto | null>(null)

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
      { endDate: scope.endDate, startDate: scope.startDate },
      { preserveScroll: true, preserveState: true, replace: true }
    )
  }, [scope.startDate, scope.endDate])

  function dateQs() {
    return { endDate: scope.endDate, startDate: scope.startDate }
  }

  function handleCreate(input: CreateExpenseInput) {
    router.post('/expenses', { ...input, ...dateQs() } as never, {
      onFinish: () => setProcessing(false),
      onStart: () => setProcessing(true),
      onSuccess: () => setDrawerOpen(false),
      preserveScroll: true,
    })
  }

  function requestConfirm(id: string) {
    const expense = expenses.items.find((e) => e.id === id)
    setPendingAction({ id, kind: 'confirm', label: expense?.label ?? 'this expense' })
  }

  function requestDelete(id: string) {
    const expense = expenses.items.find((e) => e.id === id)
    setPendingAction({ id, kind: 'delete', label: expense?.label ?? 'this expense' })
  }

  const executeAction = useCallback(() => {
    if (!pendingAction) return
    const { id, kind } = pendingAction
    setPendingAction(null)

    if (kind === 'confirm') {
      router.post(
        `/expenses/${id}/confirm-draft`,
        { ...dateQs(), page: expenses.pagination.page },
        {
          onFinish: () => setProcessingId(null),
          onStart: () => setProcessingId(id),
          preserveScroll: true,
        }
      )
    } else {
      router.delete(`/expenses/${id}`, {
        data: { ...dateQs(), page: expenses.pagination.page },
        onFinish: () => setProcessingId(null),
        onStart: () => setProcessingId(id),
        preserveScroll: true,
      })
    }
  }, [pendingAction, expenses.pagination.page, scope.startDate, scope.endDate])

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

        {cachedSummary.current ? (
          <SummaryCards summary={cachedSummary.current} />
        ) : (
          <SummaryCardsSkeleton />
        )}

        <CreateDrawer
          onClose={() => setDrawerOpen(false)}
          onSubmit={handleCreate}
          open={drawerOpen}
          processing={processing}
        />

        <DataTable
          emptyMessage="No expenses found."
          isEmpty={expenses.items.length === 0}
          onPageChange={(page) =>
            router.get(
              '/expenses',
              { ...dateQs(), page },
              { only: ['expenses'], preserveScroll: true, preserveState: true }
            )
          }
          pagination={expenses.pagination}
          title="Expense register"
        >
          <ExpenseTable
            items={expenses.items}
            onConfirm={requestConfirm}
            onDelete={requestDelete}
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
