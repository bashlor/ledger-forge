import type { DateFilter } from '#core/accounting/application/expenses/index'
import type { SQL } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { customers, invoiceLines, invoices } from '#core/accounting/drizzle/schema'
import { and, count, desc, eq, gte, inArray, like, lte, sql } from 'drizzle-orm'

import type { InvoiceListScopeInput, InvoiceRow } from '../types.js'

type DrizzleDb = PostgresJsDatabase<any>
type DrizzleTx = Parameters<Parameters<DrizzleDb['transaction']>[0]>[0]
type InvoiceDbExecutor = DrizzleDb | DrizzleTx
type TenantScopedQueryInput = { tenantId?: null | string }

export async function findFirstInvoiceIdForCustomer(
  db: DrizzleDb,
  input: {
    customerId: string
    dateFilter?: DateFilter
    tenantId?: null | string
  }
): Promise<null | string> {
  const where = applyInvoiceTenantScope(
    and(eq(invoices.customerId, input.customerId), invoiceDateCondition(input.dateFilter)),
    input.tenantId
  )
  const [row] = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(where)
    .orderBy(desc(invoices.issueDate), desc(invoices.invoiceNumber))
    .limit(1)
  return row?.id ?? null
}

export async function getInvoiceById(
  db: InvoiceDbExecutor,
  input: { id: string; tenantId?: null | string }
): Promise<InvoiceRow | undefined> {
  const [row] = await db
    .select()
    .from(invoices)
    .where(applyInvoiceTenantScope(eq(invoices.id, input.id), input.tenantId))
  return row
}

export async function getInvoiceByPublicId(
  db: InvoiceDbExecutor,
  input: { invoiceNumber: string; tenantId?: null | string }
): Promise<InvoiceRow | undefined> {
  const [row] = await db
    .select()
    .from(invoices)
    .where(applyInvoiceTenantScope(eq(invoices.invoiceNumber, input.invoiceNumber), input.tenantId))
  return row
}

export async function getInvoiceForListScope(
  db: InvoiceDbExecutor,
  input: {
    id: string
    scope: InvoiceListScopeInput
    tenantId?: null | string
  }
): Promise<InvoiceRow | undefined> {
  let where = eq(invoices.id, input.id)
  if (input.scope.customerId) {
    where = and(where, eq(invoices.customerId, input.scope.customerId))!
  }
  if (input.scope.dateFilter) {
    where = and(where, invoiceDateCondition(input.scope.dateFilter))!
  }

  const [row] = await db
    .select()
    .from(invoices)
    .where(applyInvoiceTenantScope(where, input.tenantId))
  return row
}

export async function getInvoiceSummary(
  db: DrizzleDb,
  input: {
    filter?: DateFilter
    tenantId?: null | string
    today: string
  }
): Promise<{ draftCount: number; issuedCount: number; overdueCount: number }> {
  const where = applyInvoiceTenantScope(invoiceDateCondition(input.filter), input.tenantId)
  const [row] = await db
    .select({
      draftCount:
        sql<number>`coalesce(sum(case when ${invoices.status} = 'draft' then 1 else 0 end), 0)::int`.mapWith(
          Number
        ),
      issuedCount:
        sql<number>`coalesce(sum(case when ${invoices.status} = 'issued' then 1 else 0 end), 0)::int`.mapWith(
          Number
        ),
      overdueCount:
        sql<number>`coalesce(sum(case when ${invoices.status} = 'issued' and ${invoices.dueDate} < ${input.today} then 1 else 0 end), 0)::int`.mapWith(
          Number
        ),
    })
    .from(invoices)
    .where(where)

  return {
    draftCount: row?.draftCount ?? 0,
    issuedCount: row?.issuedCount ?? 0,
    overdueCount: row?.overdueCount ?? 0,
  }
}

export function invoiceDateCondition(filter?: DateFilter) {
  if (!filter) return undefined
  return and(gte(invoices.issueDate, filter.startDate), lte(invoices.issueDate, filter.endDate))
}

export async function listCustomersForSelect(db: DrizzleDb, tenantId?: null | string) {
  const where = tenantId ? eq(customers.organizationId, tenantId) : undefined
  return db
    .select({
      company: customers.company,
      email: customers.email,
      id: customers.id,
      name: customers.name,
      phone: customers.phone,
    })
    .from(customers)
    .where(where)
    .orderBy(customers.company)
}

export async function listInvoiceLinesForInvoice(db: InvoiceDbExecutor, invoiceId: string) {
  return db
    .select()
    .from(invoiceLines)
    .where(eq(invoiceLines.invoiceId, invoiceId))
    .orderBy(invoiceLines.lineNumber)
}

export async function listInvoiceLinesForInvoiceIds(db: DrizzleDb, invoiceIds: string[]) {
  return db
    .select()
    .from(invoiceLines)
    .where(inArray(invoiceLines.invoiceId, invoiceIds))
    .orderBy(invoiceLines.invoiceId, invoiceLines.lineNumber)
}

export async function listInvoicesByTenant(
  db: DrizzleDb,
  input: {
    dateFilter?: DateFilter
    page: number
    perPage: number
    tenantId?: null | string
  }
): Promise<{ rows: InvoiceRow[]; totalCount: number }> {
  const where = applyInvoiceTenantScope(invoiceDateCondition(input.dateFilter), input.tenantId)
  const [{ totalCount }] = await db.select({ totalCount: count() }).from(invoices).where(where)
  const offset = (input.page - 1) * input.perPage
  const rows = await db
    .select()
    .from(invoices)
    .where(where)
    .orderBy(desc(invoices.issueDate), desc(invoices.invoiceNumber))
    .limit(input.perPage)
    .offset(offset)

  return { rows, totalCount }
}

export async function loadInvoiceForMutation(
  tx: InvoiceDbExecutor,
  input: { id: string; tenantId?: null | string }
): Promise<InvoiceRow | undefined> {
  const [row] = await tx
    .select()
    .from(invoices)
    .where(applyInvoiceTenantScope(eq(invoices.id, input.id), input.tenantId))
  return row
}

export async function nextInvoiceNumber(db: InvoiceDbExecutor, issueDate: string): Promise<string> {
  const year = issueDate.slice(0, 4)
  const lockKey = `invoice-number-${year}`
  await db.execute(sql`select pg_advisory_xact_lock(hashtext(${lockKey}))`)

  const [{ lastSequence }] = await db
    .select({
      lastSequence:
        sql<number>`coalesce(max(((regexp_match(${invoices.invoiceNumber}, ${`^INV-${year}-(\\d+)$`}))[1])::int), 0)`.mapWith(
          Number
        ),
    })
    .from(invoices)
    .where(like(invoices.invoiceNumber, `INV-${year}-%`))

  return `INV-${year}-${String((lastSequence ?? 0) + 1).padStart(3, '0')}`
}

export async function readCustomerSnapshot(
  db: InvoiceDbExecutor,
  customerId: string,
  tenantId?: null | string
) {
  const where = tenantId
    ? and(eq(customers.id, customerId), eq(customers.organizationId, tenantId))
    : eq(customers.id, customerId)
  const [row] = await db
    .select({
      address: customers.address,
      company: customers.company,
      email: customers.email,
      id: customers.id,
      name: customers.name,
      phone: customers.phone,
    })
    .from(customers)
    .where(where)
  return row
}

function applyInvoiceTenantScope(
  where: SQL<unknown> | undefined,
  tenantId: TenantScopedQueryInput['tenantId']
): SQL<unknown> | undefined {
  if (!tenantId) return where
  return and(where, eq(invoices.organizationId, tenantId))
}
