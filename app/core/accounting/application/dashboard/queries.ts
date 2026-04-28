import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { expenses, invoices } from '#core/accounting/drizzle/schema'
import { toSafeCentsNumber } from '#core/shared/money'
import { and, desc, eq, inArray, sum } from 'drizzle-orm'

import type { DashboardQueryData } from './types.js'

type DrizzleDb = PostgresJsDatabase<any>

/**
 * Dashboard aggregates for the active organization (`tenantId` = `organizationId` on rows).
 * All queries are org-scoped; there is no per-user row filter — same model as invoice/expense
 * lists today. If the product later requires “my data only” metrics, add an explicit predicate
 * (e.g. `createdBy`) once the schema exposes it.
 *
 * Performance note (PR 9): this runs four SQL queries in parallel. Loading it synchronously in
 * the controller blocks the first Inertia response until they finish; deferring the dashboard
 * prop moves that work off the critical path so time-to-first-byte drops by roughly the DB
 * portion of that work (measurable with server timing or `curl -w '%{time_starttransfer}'`).
 */
export async function loadDashboardQueryData(
  db: DrizzleDb,
  tenantId: string
): Promise<DashboardQueryData> {
  const orgWhere = eq(invoices.organizationId, tenantId)
  const orgExpenseWhere = eq(expenses.organizationId, tenantId)
  const [recentInvoicesRows, revenueSumRow, collectedSumRow, expenseSumRow] = await Promise.all([
    db
      .select({
        customerCompanyName: invoices.customerCompanyName,
        dueDate: invoices.dueDate,
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        issueDate: invoices.issueDate,
        status: invoices.status,
        totalInclTaxCents: invoices.totalInclTaxCents,
      })
      .from(invoices)
      .where(orgWhere)
      .orderBy(desc(invoices.issueDate))
      .limit(6),
    db
      .select({ total: sum(invoices.totalInclTaxCents) })
      .from(invoices)
      .where(and(orgWhere, inArray(invoices.status, ['issued', 'paid']))),
    db
      .select({ total: sum(invoices.totalInclTaxCents) })
      .from(invoices)
      .where(and(orgWhere, eq(invoices.status, 'paid'))),
    db
      .select({ total: sum(expenses.amountCents) })
      .from(expenses)
      .where(and(orgExpenseWhere, eq(expenses.status, 'confirmed'))),
  ])

  return {
    collectedTotalCents: toSafeCentsNumber(
      collectedSumRow[0]?.total,
      'dashboard.collectedTotalCents'
    ),
    expenseTotalCents: toSafeCentsNumber(expenseSumRow[0]?.total, 'dashboard.expenseTotalCents'),
    recentInvoicesRows: recentInvoicesRows.map((row) => ({
      customerCompanyName: row.customerCompanyName,
      dueDate: row.dueDate,
      id: row.id,
      invoiceNumber: row.invoiceNumber,
      issueDate: row.issueDate,
      status: row.status,
      totalInclTaxCents: row.totalInclTaxCents,
    })),
    revenueTotalCents: toSafeCentsNumber(revenueSumRow[0]?.total, 'dashboard.revenueTotalCents'),
  }
}
