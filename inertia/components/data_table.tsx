import type { PaginationMetaDto } from '~/lib/types'

import { EmptyState } from './empty_state'
import { Pagination } from './pagination'

interface DataTableProps {
  children: React.ReactNode
  emptyMessage: string
  headerContent?: React.ReactNode
  isEmpty: boolean
  onPageChange?: (page: number) => void
  onPerPageChange?: (perPage: number) => void
  pagination?: PaginationMetaDto
  title: string
}

export function DataTable({
  children,
  emptyMessage,
  headerContent,
  isEmpty,
  onPageChange,
  onPerPageChange,
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
        <EmptyState message={emptyMessage} />
      ) : (
        <>
          <div className="overflow-x-auto">{children}</div>
          {pagination && onPageChange && (
            <Pagination
              onPageChange={onPageChange}
              onPerPageChange={onPerPageChange}
              pagination={pagination}
            />
          )}
        </>
      )}
    </section>
  )
}
