import type { PaginationMetaDto } from '~/lib/types'

import { Select } from '~/components/ui'
import { PAGE_SIZE_OPTIONS } from '~/lib/pagination'

interface PaginationProps {
  onPageChange: (page: number) => void
  onPerPageChange?: (perPage: number) => void
  pagination: PaginationMetaDto
}

const perPageOptions = PAGE_SIZE_OPTIONS.map((option) => ({
  label: `${option} lignes par page`,
  triggerLabel: String(option),
  value: String(option),
}))

export function Pagination({ onPageChange, onPerPageChange, pagination }: PaginationProps) {
  const { page, perPage, totalItems, totalPages } = pagination
  const from = totalItems === 0 ? 0 : (page - 1) * perPage + 1
  const to = Math.min(page * perPage, totalItems)

  return (
    <div className="flex flex-col gap-3 border-t border-outline-variant/10 px-4 py-3.5 text-sm text-on-surface-variant sm:flex-row sm:items-center sm:justify-between">
      <p className="tabular-nums">
        {totalItems === 0 ? (
          <>Aucun résultat</>
        ) : (
          <>
            {from} à {to} sur {totalItems}
            <span className="text-on-surface-variant/70"> · </span>
            Page {page} / {totalPages}
          </>
        )}
      </p>
      <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end sm:gap-3">
        <div className="flex items-center gap-2">
          <button
            className="rounded-lg border border-outline-variant/20 px-3 py-2 text-sm font-medium text-on-surface transition-colors duration-150 hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            type="button"
          >
            Précédent
          </button>
          <button
            className="rounded-lg border border-outline-variant/20 px-3 py-2 text-sm font-medium text-on-surface transition-colors duration-150 hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-50"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            type="button"
          >
            Suivant
          </button>
        </div>
        {onPerPageChange ? (
          <Select
            aria-label="Nombre d’éléments par page"
            label="Lignes par page"
            onValueChange={(next) => onPerPageChange(Number(next))}
            options={perPageOptions}
            size="compact"
            triggerClassName="min-w-[2.75rem] justify-center tabular-nums sm:min-w-12"
            value={String(perPage)}
          />
        ) : null}
      </div>
    </div>
  )
}
