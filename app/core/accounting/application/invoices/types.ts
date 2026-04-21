import type { AuditEventDto } from '#core/accounting/application/audit/types'
import type { DateFilter } from '#core/accounting/application/expenses/index'
import type { AccountingAccessContext } from '#core/accounting/application/support/access_context'

import type { InvoiceStatus } from './domain/invoice_status.js'
export type { InvoiceStatus } from './domain/invoice_status.js'
export type { AuditEventDto }

export interface CustomerForSelectDto {
  company: string
  email: string
  id: string
  name: string
  phone: string
}

export interface CustomerSnapshotSource {
  address: string
  company: string
  email: string
  name: string
  phone: string
}

export interface InvoiceConcurrencyHooks {
  afterRead?: () => Promise<void>
}

export type InvoiceCustomerSnapshot = Pick<
  InvoiceRow,
  | 'customerCompanyAddressSnapshot'
  | 'customerCompanySnapshot'
  | 'customerEmailSnapshot'
  | 'customerPhoneSnapshot'
  | 'customerPrimaryContactSnapshot'
>

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

export interface InvoiceLineDto {
  description: string
  id: string
  lineTotalExclTax: number
  lineTotalInclTax: number
  lineVatAmount: number
  quantity: number
  unitPrice: number
  vatRate: number
}

export type InvoiceLineRow =
  (typeof import('#core/accounting/drizzle/schema'))['invoiceLines']['$inferSelect']

export interface InvoiceListResult {
  items: InvoiceDto[]
  pagination: {
    page: number
    perPage: number
    totalItems: number
    totalPages: number
  }
}

export interface InvoiceListScopeInput {
  customerId?: null | string
  dateFilter?: DateFilter
}

export interface InvoiceRequestContext extends AccountingAccessContext {
  tenantId: string
}

export type InvoiceRow =
  (typeof import('#core/accounting/drizzle/schema'))['invoices']['$inferSelect']

export interface InvoiceSummaryDto {
  draftCount: number
  issuedCount: number
  overdueCount: number
}

export interface IssueInvoiceInput {
  issuedCompanyAddress: string
  issuedCompanyName: string
}

export interface NormalizedIssueInvoiceInput {
  issuedCompanyAddress: string
  issuedCompanyName: string
}

export interface NormalizedSaveInvoiceDraftInput {
  customerId: string
  dueDate: string
  issueDate: string
  lines: SaveInvoiceLineInput[]
}

export interface SaveInvoiceDraftInput {
  customerId: string
  dueDate: string
  issueDate: string
  lines: SaveInvoiceLineInput[]
}

export interface SaveInvoiceLineInput {
  description: string
  quantity: number
  unitPrice: number
  vatRate: number
}
