import type { PaginationMetaDto } from '~/lib/types'

interface PaginationProps {
  onPageChange: (page: number) => void
  pagination: PaginationMetaDto
}

export function Pagination({ onPageChange, pagination }: PaginationProps) {
  const { page, perPage, totalItems, totalPages } = pagination
  const from = totalItems === 0 ? 0 : (page - 1) * perPage + 1
  const to = Math.min(page * perPage, totalItems)

  return (
    <div className="flex flex-col gap-3 border-t border-outline-variant/10 px-4 py-3 text-sm text-on-surface-variant sm:flex-row sm:items-center sm:justify-between">
      <p>
        {from}–{to} of {totalItems} · Page {page} / {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <button
          className="rounded-lg border border-outline-variant/20 px-3 py-2 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-50"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          type="button"
        >
          Previous
        </button>
        <button
          className="rounded-lg border border-outline-variant/20 px-3 py-2 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-50"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          type="button"
        >
          Next
        </button>
      </div>
    </div>
  )
}
