import type { InvoiceStatus } from '#core/accounting/application/invoices/index'

export interface DashboardDto {
  recentInvoices: {
    customerCompanyName: string
    date: string
    dueDate: string
    id: string
    invoiceNumber: string
    status: InvoiceStatus
    totalInclTax: number
  }[]
  summary: {
    profit: number
    totalCollected: number
    totalExpenses: number
    totalRevenue: number
  }
}

export interface DashboardQueryData {
  collectedTotalCents: number
  expenseTotalCents: number
  recentInvoicesRows: {
    customerCompanyName: string
    dueDate: string
    id: string
    invoiceNumber: string
    issueDate: string
    status: InvoiceStatus
    totalInclTaxCents: number
  }[]
  revenueTotalCents: number
}
