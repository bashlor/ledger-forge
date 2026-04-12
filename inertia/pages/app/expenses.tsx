import { Head, router } from '@inertiajs/react'
import { useEffect, useRef, useState } from 'react'

import type { CreateExpenseInput, ExpenseDto, ExpenseSummaryDto, PaginationMetaDto } from '~/lib/types'

import { useDateScope } from '~/components/date_scope_provider'
import { PageHeader } from '~/components/page_header'

import type { InertiaProps } from '../../types'

import { CreateDrawer } from './expenses/create_drawer'
import { Pagination } from './expenses/pagination'
import { SummaryCards, SummaryCardsSkeleton } from './expenses/summary_cards'
import { ExpenseTable } from './expenses/table'

type Props = InertiaProps<{
  expenses: { items: ExpenseDto[]; pagination: PaginationMetaDto }
  summary?: ExpenseSummaryDto
}>

export default function ExpensesPage({ expenses, summary }: Props) {
  const { scope } = useDateScope()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [processingId, setProcessingId] = useState<null | string>(null)
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

  function handleConfirm(id: string) {
    router.post(
      `/expenses/${id}/confirm-draft`,
      { ...dateQs(), page: expenses.pagination.page },
      {
        onFinish: () => setProcessingId(null),
        only: ['expenses'],
        onStart: () => setProcessingId(id),
        preserveScroll: true,
      }
    )
  }

  function handleDelete(id: string) {
    if (!window.confirm('Delete this draft expense?')) return

    router.delete(`/expenses/${id}`, {
      data: { ...dateQs(), page: expenses.pagination.page },
      onFinish: () => setProcessingId(null),
      only: ['expenses'],
      onStart: () => setProcessingId(id),
      preserveScroll: true,
    })
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

        {cachedSummary.current
          ? <SummaryCards summary={cachedSummary.current} />
          : <SummaryCardsSkeleton />
        }

        <CreateDrawer
          onClose={() => setDrawerOpen(false)}
          onSubmit={handleCreate}
          open={drawerOpen}
          processing={processing}
        />

        <section className="overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-ambient-tight">
          <div className="border-b border-outline-variant/10 px-4 py-3">
            <h2 className="text-base font-semibold text-on-surface">Expense register</h2>
          </div>

          <ExpenseTable
            items={expenses.items}
            onConfirm={handleConfirm}
            onDelete={handleDelete}
            processingId={processingId}
          />

          {expenses.items.length > 0 && (
            <Pagination
              onPageChange={(page) =>
                router.get(
                  '/expenses',
                  { ...dateQs(), page },
                  { only: ['expenses'], preserveScroll: true, preserveState: true }
                )
              }
              pagination={expenses.pagination}
            />
          )}
        </section>
      </div>
    </>
  )
}
