import type { PaginationMetaDto } from '~/lib/types'

import { Pagination } from './pagination'

interface DataTableProps {
  children: React.ReactNode
  emptyMessage: string
  headerContent?: React.ReactNode
  isEmpty: boolean
  onPageChange?: (page: number) => void
  pagination?: PaginationMetaDto
  title: string
}

export function DataTable({
  children,
  emptyMessage,
  headerContent,
  isEmpty,
  onPageChange,
  pagination,
  title,
}: DataTableProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-ambient-tight">
      <div className="border-b border-outline-variant/10 px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-on-surface">{title}</h2>
          {headerContent ? <div className="min-w-0">{headerContent}</div> : null}
        </div>
      </div>

      {isEmpty ? (
        <div className="px-4 py-8">
          <div className="rounded-lg border border-dashed border-outline-variant/35 bg-surface-container-low px-4 py-5 text-sm text-on-surface-variant">
            {emptyMessage}
          </div>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">{children}</div>
          {pagination && onPageChange && (
            <Pagination onPageChange={onPageChange} pagination={pagination} />
          )}
        </>
      )}
    </section>
  )
}
