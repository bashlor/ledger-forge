import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import {
  type AccountingAccessContext,
  type AccountingActivitySink,
  type AccountingServiceDependencies,
  SYSTEM_ACCOUNTING_ACCESS_CONTEXT,
} from '#core/accounting/accounting_context'
import { customers, invoices } from '#core/accounting/drizzle/schema'
import { DomainError } from '#core/shared/domain_error'
import { and, count, eq, inArray, sql } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'

export interface CreateCustomerInput {
  address: string
  company: string
  email?: string
  name: string
  note?: string
  phone?: string
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

interface CustomerDto {
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

type CustomerRow = typeof customers.$inferSelect

interface NormalizedCustomerInput {
  address: string
  company: string
  email: string
  name: string
  note: string | undefined
  phone: string
}

export class CustomerService {
  private readonly activitySink?: AccountingActivitySink

  constructor(
    private readonly db: PostgresJsDatabase<any>,
    dependencies: AccountingServiceDependencies = {}
  ) {
    this.activitySink = dependencies.activitySink
  }

  async createCustomer(
    input: CreateCustomerInput,
    access: AccountingAccessContext = SYSTEM_ACCOUNTING_ACCESS_CONTEXT
  ): Promise<CustomerDto> {
    const normalized = normalizeCustomerInput(input)

    const [row] = await this.db
      .insert(customers)
      .values({
        address: normalized.address,
        company: normalized.company,
        email: normalized.email,
        id: uuidv7(),
        name: normalized.name,
        note: normalized.note,
        phone: normalized.phone,
      })
      .returning()

    await this.activitySink?.record({
      actorId: access.actorId,
      boundedContext: 'accounting',
      isAnonymous: access.isAnonymous,
      operation: 'create_customer',
      outcome: 'success',
      resourceId: row.id,
      resourceType: 'customer',
    })

    return toCustomerDto(row, { invoiceCount: 0, totalInvoicedCents: 0 })
  }

  async deleteCustomer(
    id: string,
    access: AccountingAccessContext = SYSTEM_ACCOUNTING_ACCESS_CONTEXT
  ): Promise<void> {
    return this.db.transaction(async (tx) => {
      const [{ invCount }] = await tx
        .select({ invCount: count() })
        .from(invoices)
        .where(eq(invoices.customerId, id))

      if (invCount > 0) {
        throw new DomainError(
          'This customer is referenced by one or more invoices.',
          'business_logic_error'
        )
      }

      const [deleted] = await tx.delete(customers).where(eq(customers.id, id)).returning({
        id: customers.id,
      })

      if (!deleted) {
        throw new DomainError('Customer not found.', 'not_found')
      }

      await this.activitySink?.record({
        actorId: access.actorId,
        boundedContext: 'accounting',
        isAnonymous: access.isAnonymous,
        operation: 'delete_customer',
        outcome: 'success',
        resourceId: id,
        resourceType: 'customer',
      })
    })
  }

  async listCustomersPage(
    page = 1,
    perPage = 5,
    _access: AccountingAccessContext = SYSTEM_ACCOUNTING_ACCESS_CONTEXT
  ): Promise<CustomerListResult> {
    const [{ totalCount }] = await this.db.select({ totalCount: count() }).from(customers)

    const totalPages = Math.max(1, Math.ceil(totalCount / perPage))
    const safePage = Math.min(Math.max(page, 1), totalPages)
    const offset = (safePage - 1) * perPage

    const [{ linkedCustomers }] = await this.db
      .select({
        linkedCustomers: sql<number>`count(distinct ${invoices.customerId})::int`.mapWith(Number),
      })
      .from(invoices)

    const [{ totalInvoicedCents }] = await this.db
      .select({
        totalInvoicedCents:
          sql<number>`coalesce(sum(${invoices.totalInclTaxCents}) filter (where ${invoices.status} <> 'draft'), 0)::bigint`.mapWith(
            Number
          ),
      })
      .from(invoices)

    const rows = await this.db
      .select()
      .from(customers)
      .orderBy(customers.company)
      .limit(perPage)
      .offset(offset)

    if (rows.length === 0) {
      return {
        items: [],
        pagination: {
          page: safePage,
          perPage,
          totalItems: totalCount,
          totalPages,
        },
        summary: {
          linkedCustomers,
          totalCount,
          totalInvoiced: Number(totalInvoicedCents ?? 0) / 100,
        },
      }
    }

    const ids = rows.map((r) => r.id)
    const aggRows = await this.db
      .select({
        customerId: invoices.customerId,
        invoiceCount: sql<number>`count(${invoices.id})::int`.mapWith(Number),
        totalInvoicedCents:
          sql<number>`coalesce(sum(case when ${invoices.status} <> 'draft' then ${invoices.totalInclTaxCents} else 0 end), 0)::bigint`.mapWith(
            Number
          ),
      })
      .from(invoices)
      .where(inArray(invoices.customerId, ids))
      .groupBy(invoices.customerId)

    const aggById = new Map(
      aggRows.map((a) => [
        a.customerId,
        { invoiceCount: a.invoiceCount, totalInvoicedCents: a.totalInvoicedCents },
      ])
    )

    const items = rows.map((row) => {
      const agg = aggById.get(row.id) ?? { invoiceCount: 0, totalInvoicedCents: 0 }
      return toCustomerDto(row, agg)
    })

    return {
      items,
      pagination: {
        page: safePage,
        perPage,
        totalItems: totalCount,
        totalPages,
      },
      summary: {
        linkedCustomers,
        totalCount,
        totalInvoiced: Number(totalInvoicedCents ?? 0) / 100,
      },
    }
  }

  async updateCustomer(
    id: string,
    input: CreateCustomerInput,
    access: AccountingAccessContext = SYSTEM_ACCOUNTING_ACCESS_CONTEXT
  ): Promise<CustomerDto> {
    const [existing] = await this.db.select().from(customers).where(eq(customers.id, id))

    if (!existing) {
      throw new DomainError('Customer not found.', 'not_found')
    }

    const normalized = normalizeCustomerInput(input)
    const snapshotChanged =
      existing.address !== normalized.address ||
      existing.company !== normalized.company ||
      existing.email !== normalized.email ||
      existing.name !== normalized.name ||
      existing.phone !== normalized.phone

    const updatedRow = await this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(customers)
        .set({
          address: normalized.address,
          company: normalized.company,
          email: normalized.email,
          name: normalized.name,
          note: normalized.note,
          phone: normalized.phone,
        })
        .where(eq(customers.id, id))
        .returning()

      if (!updated) {
        throw new DomainError('Customer not found.', 'not_found')
      }

      if (snapshotChanged) {
        await tx
          .update(invoices)
          .set({
            customerCompanyAddressSnapshot: normalized.address,
            customerCompanyName: normalized.company,
            customerCompanySnapshot: normalized.company,
            customerEmailSnapshot: normalized.email,
            customerPhoneSnapshot: normalized.phone,
            customerPrimaryContactSnapshot: normalized.name,
          })
          .where(and(eq(invoices.customerId, id), eq(invoices.status, 'draft')))
      }

      return updated
    })

    await this.activitySink?.record({
      actorId: access.actorId,
      boundedContext: 'accounting',
      isAnonymous: access.isAnonymous,
      operation: 'update_customer',
      outcome: 'success',
      resourceId: id,
      resourceType: 'customer',
    })

    const agg = await this.invoiceAggregateForCustomer(id)
    return toCustomerDto(updatedRow, agg)
  }

  private async invoiceAggregateForCustomer(customerId: string): Promise<{
    invoiceCount: number
    totalInvoicedCents: number
  }> {
    const [row] = await this.db
      .select({
        invoiceCount: sql<number>`count(${invoices.id})::int`.mapWith(Number),
        totalInvoicedCents:
          sql<number>`coalesce(sum(case when ${invoices.status} <> 'draft' then ${invoices.totalInclTaxCents} else 0 end), 0)::bigint`.mapWith(
            Number
          ),
      })
      .from(invoices)
      .where(eq(invoices.customerId, customerId))

    return {
      invoiceCount: row?.invoiceCount ?? 0,
      totalInvoicedCents: row?.totalInvoicedCents ?? 0,
    }
  }
}

function normalizeCustomerInput(input: CreateCustomerInput): NormalizedCustomerInput {
  const address = input.address.trim()
  const company = input.company.trim()
  const email = input.email?.trim() || ''
  const name = input.name.trim()
  const note = input.note?.trim() || undefined
  const phone = input.phone?.trim() || ''

  if (!address) {
    throw new DomainError('Customer address is required.', 'invalid_data')
  }

  if (!company) {
    throw new DomainError('Customer company is required.', 'invalid_data')
  }

  if (!name) {
    throw new DomainError('Customer contact name is required.', 'invalid_data')
  }

  if (!email && !phone) {
    throw new DomainError('Provide at least an email or a phone number.', 'invalid_data')
  }

  return {
    address,
    company,
    email,
    name,
    note,
    phone,
  }
}

function toCustomerDto(
  row: CustomerRow,
  agg: { invoiceCount: number; totalInvoicedCents: number }
): CustomerDto {
  const canDelete = agg.invoiceCount === 0
  return {
    address: row.address,
    canDelete,
    company: row.company,
    deleteBlockReason: canDelete
      ? undefined
      : 'This customer is referenced by one or more invoices.',
    email: row.email,
    id: row.id,
    invoiceCount: agg.invoiceCount,
    name: row.name,
    note: row.note ?? undefined,
    phone: row.phone,
    totalInvoiced: agg.totalInvoicedCents / 100,
  }
}
