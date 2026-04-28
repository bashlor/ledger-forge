import type { ReactNode } from 'react'

import type { PaginationMetaDto } from '~/lib/types'

import { EmptyState } from './empty_state'
import { Pagination } from './pagination'
import { Panel } from './ui'

interface DataTableProps {
  children: ReactNode
  emptyMessage: string
  headerContent?: ReactNode
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
    <Panel>
      <div className="border-b border-outline-variant px-4 py-3 sm:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
          <h2 className="shrink-0 text-base font-semibold tracking-tight text-on-surface lg:text-[15px]">
            {title}
          </h2>
          {headerContent ? (
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-2">
              {headerContent}
            </div>
          ) : null}
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
    </Panel>
  )
}
