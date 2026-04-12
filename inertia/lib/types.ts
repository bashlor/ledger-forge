export interface CreateCustomerInput {
  company: string
  email: string
  name: string
  note?: string
  phone: string
}

export interface CreateExpenseInput {
  amount: number
  category: string
  date: string
  label: string
}

export interface CreateInvoiceInput {
  customerId: string
  dueDate: string
  issueDate: string
  lines: InvoiceLineInput[]
}

export interface CustomerDto {
  canDelete?: boolean
  company: string
  deleteBlockReason?: string
  email: string
  id: string
  invoiceCount?: number
  name: string
  note?: string
  phone: string
  totalInvoiced?: number
}

export interface DashboardDto {
  recentInvoices: DashboardRecentInvoiceDto[]
  summary: {
    profit: number
    totalCollected: number
    totalExpenses: number
    totalRevenue: number
  }
}

export interface DashboardRecentInvoiceDto {
  customerName: string
  date: string
  dueDate: string
  id: string
  invoiceNumber: string
  status: InvoiceStatus
  totalInclTax: number
}

export interface DateRange {
  endDate: string
  startDate: string
}

export interface DateScope extends DateRange {
  label: string
  mode: DateScopeMode
}

export type DateScopeMode = 'custom' | 'month'

export interface ExpenseDto {
  amount: number
  canConfirm?: boolean
  canDelete?: boolean
  category: string
  date: string
  id: string
  label: string
  status: ExpenseStatus
}

export interface ExpenseListDto {
  items: ExpenseDto[]
  pagination: PaginationMetaDto
  summary: ExpenseSummaryDto
}

export type ExpenseStatus = 'confirmed' | 'draft'

export interface ExpenseSummaryDto {
  confirmedCount: number
  draftCount: number
  totalAmount: number
  totalCount: number
}

export interface InvoiceDto {
  customerId: string
  customerName: string
  dueDate: string
  id: string
  invoiceNumber: string
  issueDate: string
  lines: InvoiceLineDto[]
  status: InvoiceStatus
  subtotalExclTax: number
  totalInclTax: number
  totalVat: number
}

export interface InvoiceLineDto extends InvoiceLineInput {
  id: string
  lineTotalExclTax: number
  lineTotalInclTax: number
  lineVatAmount: number
}

export interface InvoiceLineInput {
  description: string
  quantity: number
  unitPrice: number
  vatRate: number
}

export type InvoiceStatus = 'draft' | 'issued' | 'paid'

export interface PaginatedList<T> {
  items: T[]
  pagination: PaginationMetaDto
}

export interface PaginationMetaDto {
  page: number
  perPage: number
  totalItems: number
  totalPages: number
}

export interface ValidationErrors {
  [field: string]: string[]
}
