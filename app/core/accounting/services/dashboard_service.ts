import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { expenses, invoices } from '#core/accounting/drizzle/schema'
import { desc, eq, inArray, sum } from 'drizzle-orm'

export interface DashboardDto {
  recentInvoices: {
    customerCompanyName: string
    date: string
    dueDate: string
    id: string
    invoiceNumber: string
    status: 'draft' | 'issued' | 'paid'
    totalInclTax: number
  }[]
  summary: {
    profit: number
    totalCollected: number
    totalExpenses: number
    totalRevenue: number
  }
}

export class DashboardService {
  constructor(private readonly db: PostgresJsDatabase<any>) {}

  async getDashboard(): Promise<DashboardDto> {
    const [recentInvoicesRows, revenueSumRow, collectedSumRow, expenseSumRow] = await Promise.all([
      // Last 6 invoices ordered by issue date
      this.db
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

      // Total revenue: all non-draft invoices
      this.db
        .select({ total: sum(invoices.totalInclTaxCents) })
        .from(invoices)
        .where(inArray(invoices.status, ['issued', 'paid'])),

      // Total collected: paid invoices only
      this.db
        .select({ total: sum(invoices.totalInclTaxCents) })
        .from(invoices)
        .where(eq(invoices.status, 'paid')),

      // Total expenses: confirmed expenses only
      this.db
        .select({ total: sum(expenses.amountCents) })
        .from(expenses)
        .where(eq(expenses.status, 'confirmed')),
    ])

    const totalRevenueCents = Number(revenueSumRow[0]?.total ?? 0)
    const totalCollectedCents = Number(collectedSumRow[0]?.total ?? 0)
    const totalExpensesCents = Number(expenseSumRow[0]?.total ?? 0)
    const totalRevenue = totalRevenueCents / 100
    const totalCollected = totalCollectedCents / 100
    const totalExpenses = totalExpensesCents / 100

    return {
      recentInvoices: recentInvoicesRows.map((row) => ({
        customerCompanyName: row.customerCompanyName,
        date: row.issueDate,
        dueDate: row.dueDate,
        id: row.id,
        invoiceNumber: row.invoiceNumber,
        status: row.status as 'draft' | 'issued' | 'paid',
        totalInclTax: row.totalInclTaxCents / 100,
      })),
      summary: {
        profit: totalRevenue - totalExpenses,
        totalCollected,
        totalExpenses,
        totalRevenue,
      },
    }
  }
}
