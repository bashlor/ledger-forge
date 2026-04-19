import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { expenses, invoices } from '#core/accounting/drizzle/schema'
import { desc, eq, inArray, sum } from 'drizzle-orm'

import type { DashboardQueryData } from './types.js'

type DrizzleDb = PostgresJsDatabase<any>

export async function loadDashboardQueryData(db: DrizzleDb): Promise<DashboardQueryData> {
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
      .orderBy(desc(invoices.issueDate))
      .limit(6),
    db
      .select({ total: sum(invoices.totalInclTaxCents) })
      .from(invoices)
      .where(inArray(invoices.status, ['issued', 'paid'])),
    db
      .select({ total: sum(invoices.totalInclTaxCents) })
      .from(invoices)
      .where(eq(invoices.status, 'paid')),
    db
      .select({ total: sum(expenses.amountCents) })
      .from(expenses)
      .where(eq(expenses.status, 'confirmed')),
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
