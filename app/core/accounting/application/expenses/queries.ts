import type { SQL } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { computePaginationWindow } from '#core/accounting/application/support/pagination'
import { expenses } from '#core/accounting/drizzle/schema'
import { and, count, desc, eq, gte, lte, sql, sum } from 'drizzle-orm'

import type { DateFilter, ExpenseListResult, ExpenseRow, ExpenseSummary } from './types.js'

type DrizzleDb = PostgresJsDatabase<any>

export function dateCondition(filter?: DateFilter) {
  if (!filter) return undefined
  return and(gte(expenses.date, filter.startDate), lte(expenses.date, filter.endDate))
}

export async function findExpenseById(
  db: DrizzleDb,
  id: string,
  tenantId?: null | string
): Promise<ExpenseRow | undefined> {
  const where = applyExpenseTenantScope(eq(expenses.id, id), tenantId)
  const [existing] = await db.select().from(expenses).where(where)
  return existing
}

export async function getExpenseSummary(
  db: DrizzleDb,
  filter?: DateFilter,
  tenantId?: null | string
): Promise<ExpenseSummary> {
  const where = applyExpenseTenantScope(dateCondition(filter), tenantId)
  const [row] = await db
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
    totalAmount: Number(row.totalAmountCents ?? 0) / 100,
    totalCount: row.totalCount,
  }
}

export async function listExpenseRows(
  db: DrizzleDb,
  page: number,
  perPage: number,
  filter?: DateFilter,
  tenantId?: null | string
): Promise<{ pagination: ExpenseListResult['pagination']; rows: ExpenseRow[] }> {
  const where = applyExpenseTenantScope(dateCondition(filter), tenantId)
  const [countRow] = await db.select({ total: count() }).from(expenses).where(where)
  const totalCount = countRow?.total ?? 0
  const paginationWindow = computePaginationWindow(totalCount, perPage, page)

  const rows = await db
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

function applyExpenseTenantScope(
  where: SQL<unknown> | undefined,
  tenantId: null | string | undefined
): SQL<unknown> | undefined {
  if (!tenantId) return where
  return and(where, eq(expenses.organizationId, tenantId))
}
