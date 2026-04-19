import type { DashboardDto, DashboardQueryData } from './types.js'

export function toDashboardDto(data: DashboardQueryData): DashboardDto {
  const totalRevenue = data.revenueTotalCents / 100
  const totalCollected = data.collectedTotalCents / 100
  const totalExpenses = data.expenseTotalCents / 100

  return {
    recentInvoices: data.recentInvoicesRows.map((row) => ({
      customerCompanyName: row.customerCompanyName,
      date: row.issueDate,
      dueDate: row.dueDate,
      id: row.id,
      invoiceNumber: row.invoiceNumber,
      status: row.status,
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
