import type { SQL } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { computePaginationWindow } from '#core/accounting/application/support/pagination'
import { customers, invoices } from '#core/accounting/drizzle/schema'
import { and, count, eq, inArray, sql } from 'drizzle-orm'

import type { CustomerAggregate, CustomerRow } from './types.js'

type DrizzleDb = PostgresJsDatabase<any>
type DrizzleTx = Parameters<Parameters<DrizzleDb['transaction']>[0]>[0]

export async function customerStateForDelete(
  tx: DrizzleTx,
  id: string,
  organizationId: string
): Promise<undefined | { id: string; invoiceCount: number }> {
  const where = applyCustomerTenantScope(eq(customers.id, id), organizationId)
  const [state] = await tx
    .select({
      id: customers.id,
      invoiceCount: count(invoices.id),
    })
    .from(customers)
    .leftJoin(invoices, eq(invoices.customerId, customers.id))
    .where(where)
    .groupBy(customers.id)
  return state
}
export async function findCustomerById(
  db: DrizzleDb,
  id: string,
  tenantId: string
): Promise<CustomerRow | undefined> {
  const where = applyCustomerTenantScope(eq(customers.id, id), tenantId)
  const [existing] = await db.select().from(customers).where(where)
  return existing
}

export async function invoiceAggregateForCustomer(
  db: DrizzleDb,
  customerId: string,
  tenantId: string
): Promise<CustomerAggregate> {
  const [row] = await db
    .select({
      invoiceCount: sql<number>`count(${invoices.id})::int`.mapWith(Number),
      totalInvoicedCents:
        sql<number>`coalesce(sum(case when ${invoices.status} <> 'draft' then ${invoices.totalInclTaxCents} else 0 end), 0)::bigint`.mapWith(
          Number
        ),
    })
    .from(invoices)
    .where(and(eq(invoices.customerId, customerId), eq(invoices.organizationId, tenantId)))

  return {
    invoiceCount: row?.invoiceCount ?? 0,
    totalInvoicedCents: row?.totalInvoicedCents ?? 0,
  }
}

export async function listCustomersWithAggregates(
  db: DrizzleDb,
  page: number,
  perPage: number,
  tenantId: string
): Promise<{
  aggregatesByCustomerId: Map<string, CustomerAggregate>
  linkedCustomers: number
  pagination: { page: number; perPage: number; totalItems: number; totalPages: number }
  rows: CustomerRow[]
  totalInvoicedCents: number
}> {
  const tenantWhere = applyCustomerTenantScope(undefined, tenantId)
  const [{ totalCount }] = await db
    .select({ totalCount: count() })
    .from(customers)
    .where(tenantWhere)
  const paginationWindow = computePaginationWindow(totalCount, perPage, page)

  const invoiceTenantWhere = eq(invoices.organizationId, tenantId)

  const [{ linkedCustomers }] = await db
    .select({
      linkedCustomers: sql<number>`count(distinct ${invoices.customerId})::int`.mapWith(Number),
    })
    .from(invoices)
    .where(invoiceTenantWhere)

  const [{ totalInvoicedCents }] = await db
    .select({
      totalInvoicedCents:
        sql<number>`coalesce(sum(${invoices.totalInclTaxCents}) filter (where ${invoices.status} <> 'draft'), 0)::bigint`.mapWith(
          Number
        ),
    })
    .from(invoices)
    .where(invoiceTenantWhere)

  const rows = await db
    .select()
    .from(customers)
    .where(tenantWhere)
    .orderBy(customers.company)
    .limit(perPage)
    .offset(paginationWindow.offset)

  if (rows.length === 0) {
    return {
      aggregatesByCustomerId: new Map(),
      linkedCustomers,
      pagination: {
        page: paginationWindow.page,
        perPage,
        totalItems: totalCount,
        totalPages: paginationWindow.totalPages,
      },
      rows,
      totalInvoicedCents: Number(totalInvoicedCents ?? 0),
    }
  }

  const ids = rows.map((r) => r.id)
  const aggregateRows = await db
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

  return {
    aggregatesByCustomerId: new Map(
      aggregateRows.map((row) => [
        row.customerId,
        { invoiceCount: row.invoiceCount, totalInvoicedCents: row.totalInvoicedCents },
      ])
    ),
    linkedCustomers,
    pagination: {
      page: paginationWindow.page,
      perPage,
      totalItems: totalCount,
      totalPages: paginationWindow.totalPages,
    },
    rows,
    totalInvoicedCents: Number(totalInvoicedCents ?? 0),
  }
}

function applyCustomerTenantScope(where: SQL<unknown> | undefined, tenantId: string): SQL<unknown> {
  return and(where, eq(customers.organizationId, tenantId))!
}
