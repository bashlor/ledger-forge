import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { expenses, invoices } from '#core/accounting/drizzle/schema'
import { and, desc, eq, inArray, sum } from 'drizzle-orm'

import type { DashboardQueryData } from './types.js'

type DrizzleDb = PostgresJsDatabase<any>

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
    collectedTotalCents: Number(collectedSumRow[0]?.total ?? 0),
    expenseTotalCents: Number(expenseSumRow[0]?.total ?? 0),
    recentInvoicesRows: recentInvoicesRows.map((row) => ({
      customerCompanyName: row.customerCompanyName,
      dueDate: row.dueDate,
      id: row.id,
      invoiceNumber: row.invoiceNumber,
      issueDate: row.issueDate,
      status: row.status,
      totalInclTaxCents: row.totalInclTaxCents,
    })),
    revenueTotalCents: Number(revenueSumRow[0]?.total ?? 0),
  }
}
