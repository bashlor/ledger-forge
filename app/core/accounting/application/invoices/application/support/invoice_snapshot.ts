import type { AccountingBusinessCalendar } from '#core/accounting/application/support/business_calendar'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { DomainError } from '#core/common/errors/domain_error'

import type { InvoiceDto, InvoiceRequestContext, InvoiceRow } from '../../types.js'

import { assertInvoiceBelongsToTenant } from '../../domain/invoice_rules.js'
import { toInvoiceDto, toLineDto } from '../../infrastructure/invoice_mappers.js'
import {
  getInvoiceById,
  listInvoiceLinesForInvoice,
  loadInvoiceForMutation,
  readCustomerSnapshot,
} from '../../infrastructure/invoice_queries.js'

type DrizzleDb = PostgresJsDatabase<any>
type DrizzleTx = Parameters<Parameters<DrizzleDb['transaction']>[0]>[0]

export async function loadCustomerSnapshotOrThrow(
  db: DrizzleDb | DrizzleTx,
  customerId: string,
  tenantId: string
) {
  const customer = await readCustomerSnapshot(db, customerId, tenantId)
  if (!customer) throw new DomainError('Customer not found.', 'not_found')
  return customer
}

export async function loadInvoiceDto(
  db: DrizzleDb | DrizzleTx,
  businessCalendar: AccountingBusinessCalendar,
  input: { invoice?: InvoiceRow; invoiceId: string },
  requestContext: InvoiceRequestContext
): Promise<InvoiceDto> {
  const invoice =
    input.invoice ??
    (await getInvoiceById(db, {
      id: input.invoiceId,
      tenantId: requestContext.tenantId,
    }))

  if (!invoice) throw new DomainError('Invoice not found.', 'not_found')

  assertInvoiceBelongsToTenant(getInvoiceTenantId(invoice), requestContext.tenantId)

  const lines = await listInvoiceLinesForInvoice(db, input.invoiceId)

  return toInvoiceDto(
    invoice,
    lines.map(toLineDto),
    businessCalendar.dateFromTimestamp(invoice.createdAt)
  )
}

export async function loadInvoiceForMutationOrThrow(
  tx: DrizzleTx,
  id: string,
  requestContext: InvoiceRequestContext
): Promise<InvoiceRow> {
  const invoice = await loadInvoiceForMutation(tx, { id, tenantId: requestContext.tenantId })
  if (!invoice) throw new DomainError('Invoice not found.', 'not_found')

  assertInvoiceBelongsToTenant(getInvoiceTenantId(invoice), requestContext.tenantId)
  return invoice
}

function getInvoiceTenantId(invoice: InvoiceRow): null | string {
  return invoice.organizationId
}
