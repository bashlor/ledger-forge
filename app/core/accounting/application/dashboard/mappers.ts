import { fromCents } from '#core/shared/money'

import type { DashboardDto, DashboardQueryData } from './types.js'

export function toDashboardDto(data: DashboardQueryData): DashboardDto {
  const totalRevenue = fromCents(data.revenueTotalCents)
  const totalCollected = fromCents(data.collectedTotalCents)
  const totalExpenses = fromCents(data.expenseTotalCents)

  return {
    recentInvoices: data.recentInvoicesRows.map((row) => ({
      customerCompanyName: row.customerCompanyName,
      date: row.issueDate,
      dueDate: row.dueDate,
      id: row.id,
      invoiceNumber: row.invoiceNumber,
      status: row.status,
      totalInclTax: fromCents(row.totalInclTaxCents),
    })),
    summary: {
      profit: totalRevenue - totalExpenses,
      totalCollected,
      totalExpenses,
      totalRevenue,
    },
  }
}
