import type { AnyColumn, SQL } from 'drizzle-orm'

import { and, gte, lte } from 'drizzle-orm'

export interface DateFilterLike {
  endDate: string
  startDate: string
}

export function buildDateFilterCondition<TDateFilter extends DateFilterLike>(
  column: AnyColumn,
  filter?: TDateFilter
): SQL<unknown> | undefined {
  if (!filter) {
    return undefined
  }

  return and(gte(column, filter.startDate), lte(column, filter.endDate))
}
