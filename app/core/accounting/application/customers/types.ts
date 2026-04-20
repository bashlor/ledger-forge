import type { customers } from '#core/accounting/drizzle/schema'

export interface CreateCustomerInput {
  address: string
  company: string
  email?: string
  name: string
  note?: string
  phone?: string
}

export interface CustomerAggregate {
  invoiceCount: number
  totalInvoicedCents: number
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

export interface CustomerListResult {
  items: CustomerDto[]
  pagination: {
    page: number
    perPage: number
    totalItems: number
    totalPages: number
  }
  summary: {
    linkedCustomers: number
    totalCount: number
    totalInvoiced: number
  }
}

export type CustomerRow = typeof customers.$inferSelect

export interface NormalizedCustomerInput {
  address: string
  company: string
  email: string
  name: string
  note: string | undefined
  phone: string
}
