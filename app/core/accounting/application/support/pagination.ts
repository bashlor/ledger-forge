export interface PaginationWindow {
  offset: number
  page: number
  totalPages: number
}

export const DEFAULT_LIST_PER_PAGE = 10
export const MAX_LIST_PER_PAGE = 100
export const MIN_LIST_PER_PAGE = 1

export function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  const normalized = Math.trunc(value)
  return Math.min(Math.max(normalized, min), max)
}

export function computePaginationWindow(
  totalItems: number,
  perPage: number,
  requestedPage: number
): PaginationWindow {
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage))
  const page = Math.min(Math.max(requestedPage, 1), totalPages)
  return {
    offset: (page - 1) * perPage,
    page,
    totalPages,
  }
}
