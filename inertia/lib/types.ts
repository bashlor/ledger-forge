export interface CreateCustomerInput {
  address: string
  company: string
  email?: string
  name: string
  note?: string
  phone?: string
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
  address: string
  canDelete: boolean
  company: string
  deleteBlockReason?: string
  email: string
  id: string
  invoiceCount: number
  name: string
  note?: string
  phone: string
  totalInvoiced: number
}

export interface CustomerListDto extends PaginatedList<CustomerDto> {
  summary: CustomerSummaryDto
}

export type CustomerListItemDto = CustomerDto

export interface CustomerSelectDto {
  company: string
  email: string
  id: string
  name: string
  phone: string
}

export interface CustomerSummaryDto {
  linkedCustomers: number
  totalCount: number
  totalInvoiced: number
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
  customerCompanyName: string
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
  canConfirm: boolean
  canDelete: boolean
  category: string
  date: string
  id: string
  label: string
  status: ExpenseStatus
}

export type ExpenseStatus = 'confirmed' | 'draft'

export interface ExpenseSummaryDto {
  confirmedCount: number
  draftCount: number
  totalAmount: number
  totalCount: number
}

export interface InvoiceAuditEventDto {
  action: string
  actorEmail: null | string
  actorId: null | string
  actorName: null | string
  changes: unknown
  createdAt: string
  entityId: string
  entityType: string
  id: string
  metadata: unknown
  organizationId: string
}

export interface InvoiceDto {
  createdAt: string
  customerCompanyAddressSnapshot: string
  customerCompanyName: string
  customerCompanySnapshot: string
  customerEmailSnapshot: string
  customerId: string
  customerPhoneSnapshot: string
  customerPrimaryContactSnapshot: string
  dueDate: string
  id: string
  invoiceNumber: string
  issueDate: string
  issuedCompanyAddress: string
  issuedCompanyName: string
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

export interface InvoiceLinePreviewDto extends InvoiceLineInput {
  lineTotalExclTax: number
  lineTotalInclTax: number
  lineVatAmount: number
}

export interface InvoicePreviewDto {
  lines: InvoiceLinePreviewDto[]
  subtotalExclTax: number
  totalInclTax: number
  totalVat: number
}

export type InvoiceStatus = 'draft' | 'issued' | 'paid'

export interface InvoiceSummaryDto {
  draftCount: number
  issuedCount: number
  overdueCount: number
}

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
