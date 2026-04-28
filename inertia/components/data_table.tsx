import type { ReactNode } from 'react'

import type { PaginationMetaDto } from '~/lib/types'

import { EmptyState } from './empty_state'
import { Pagination } from './pagination'
import { Panel } from './ui'

interface DataTableProps {
  children: ReactNode
  emptyMessage: string
  headerClassName?: string
  headerContent?: ReactNode
  isEmpty: boolean
  onPageChange?: (page: number) => void
  onPerPageChange?: (perPage: number) => void
  pagination?: PaginationMetaDto
  panelClassName?: string
  title: string
  titleClassName?: string
  toolbarClassName?: string
}

export function DataTable({
  children,
  emptyMessage,
  headerClassName,
  headerContent,
  isEmpty,
  onPageChange,
  onPerPageChange,
  pagination,
  panelClassName,
  title,
  titleClassName,
  toolbarClassName,
}: DataTableProps) {
  const headerClasses = [
    'border-b border-outline-variant px-4 py-3 sm:px-5',
    headerClassName,
  ]
    .filter(Boolean)
    .join(' ')

  const toolbarClasses = [
    'flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3',
    toolbarClassName,
  ]
    .filter(Boolean)
    .join(' ')

  const panelClasses = ['flex min-h-0 flex-col', panelClassName].filter(Boolean).join(' ')

  return (
    <Panel className={panelClasses}>
      <div className={headerClasses}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
          <h2
            className={[
              'shrink-0 text-base font-semibold tracking-tight text-on-surface lg:text-[15px]',
              titleClassName,
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {title}
          </h2>
          {headerContent ? <div className={toolbarClasses}>{headerContent}</div> : null}
        </div>
      </div>

      {isEmpty ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <>
          <div className="min-h-0 flex-1 max-h-[min(65dvh,32rem)] overflow-y-auto overflow-x-auto overscroll-contain">
            {children}
          </div>
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
