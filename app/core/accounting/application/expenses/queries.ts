import type { SQL } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { buildDateFilterCondition } from '#core/accounting/application/support/date_filter'
import { computePaginationWindow } from '#core/accounting/application/support/pagination'
import { expenses } from '#core/accounting/drizzle/schema'
import { fromCents } from '#core/shared/money'
import { and, count, desc, eq, sql, sum } from 'drizzle-orm'

import type { DateFilter, ExpenseListResult, ExpenseRow, ExpenseSummary } from './types.js'

import { requireTenantScope } from '../support/tenant_scope.js'

type DrizzleDb = PostgresJsDatabase<any>
type DrizzleExecutor = DrizzleDb | Parameters<Parameters<DrizzleDb['transaction']>[0]>[0]

export function dateCondition(filter?: DateFilter) {
  return buildDateFilterCondition(expenses.date, filter)
}

export async function findExpenseById(
  executor: DrizzleExecutor,
  id: string,
  tenantId: string
): Promise<ExpenseRow | undefined> {
  const where = applyExpenseTenantScope(eq(expenses.id, id), tenantId)
  const [existing] = await executor.select().from(expenses).where(where)
  return existing
}

export async function getExpenseSummary(
  executor: DrizzleExecutor,
  tenantId: string,
  filter?: DateFilter
): Promise<ExpenseSummary> {
  const where = applyExpenseTenantScope(dateCondition(filter), tenantId)
  const [row] = await executor
    .select({
      confirmedCount: sql<number>`count(*) filter (where ${expenses.status} = 'confirmed')`.mapWith(
        Number
      ),
      draftCount: sql<number>`count(*) filter (where ${expenses.status} = 'draft')`.mapWith(Number),
      totalAmountCents: sum(
        sql`case when ${expenses.status} = 'confirmed' then ${expenses.amountCents} else 0 end`
      ),
      totalCount: count(),
    })
    .from(expenses)
    .where(where)

  return {
    confirmedCount: row.confirmedCount,
    draftCount: row.draftCount,
    totalAmount: fromCents(Number(row.totalAmountCents ?? 0)),
    totalCount: row.totalCount,
  }
}

export async function listExpenseRows(
  executor: DrizzleExecutor,
  page: number,
  perPage: number,
  tenantId: string,
  filter?: DateFilter,
  search?: string
): Promise<{ pagination: ExpenseListResult['pagination']; rows: ExpenseRow[] }> {
  const where = applyExpenseTenantScope(combineExpenseFilters(filter, search), tenantId)
  const [countRow] = await executor.select({ total: count() }).from(expenses).where(where)
  const totalCount = countRow?.total ?? 0
  const paginationWindow = computePaginationWindow(totalCount, perPage, page)

  const rows = await executor
    .select({
      amountCents: expenses.amountCents,
      category: expenses.category,
      createdAt: expenses.createdAt,
      date: expenses.date,
      id: expenses.id,
      label: expenses.label,
      status: expenses.status,
    })
    .from(expenses)
    .where(where)
    .orderBy(desc(expenses.date), expenses.label)
    .limit(perPage)
    .offset(paginationWindow.offset)

  return {
    pagination: {
      page: paginationWindow.page,
      perPage,
      totalItems: totalCount,
      totalPages: paginationWindow.totalPages,
    },
    rows: rows as ExpenseRow[],
  }
}

function applyExpenseTenantScope(where: SQL<unknown> | undefined, tenantId: string): SQL<unknown> {
  return requireTenantScope(where, tenantId, expenses.organizationId)
}

function combineExpenseFilters(filter?: DateFilter, search?: string): SQL<unknown> | undefined {
  const byDate = dateCondition(filter)
  const bySearch = searchCondition(search)

  if (byDate && bySearch) {
    return and(byDate, bySearch)
  }

  return byDate ?? bySearch
}

function searchCondition(search?: string): SQL<unknown> | undefined {
  const term = search?.trim().toLowerCase()
  if (!term) {
    return undefined
  }

  // Demo-sized contains search: tenant scoping bounds the scan; revisit pg_trgm for larger data.
  const pattern = `%${term}%`
  return sql`(lower(${expenses.label}) like ${pattern} or lower(${expenses.category}) like ${pattern})`
}
