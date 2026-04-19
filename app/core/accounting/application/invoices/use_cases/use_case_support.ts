import type { AccountingActivitySink } from '#core/accounting/application/support/activity_log'
import type { AccountingBusinessCalendar } from '#core/accounting/application/support/business_calendar'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { DomainError } from '#core/common/errors/domain_error'

import type {
  CustomerSnapshotSource,
  InvoiceDto,
  InvoiceRequestContext,
  InvoiceRow,
  NormalizedSaveInvoiceDraftInput,
} from '../types.js'

import { calculateLine, calculateTotals, fromDisplayUnits } from '../calculations.js'
import {
  getInvoiceById,
  listInvoiceLinesForInvoice,
  loadInvoiceForMutation,
  readCustomerSnapshot,
} from '../db/invoice_queries.js'
import { assertInvoiceBelongsToTenant } from '../domain/invoice_rules.js'
import { toCustomerSnapshot, toInvoiceDto, toLineDto } from '../mappers.js'

export interface InvoiceUseCaseDeps {
  activitySink?: AccountingActivitySink
  businessCalendar: AccountingBusinessCalendar
  db: DrizzleDb
}
type DrizzleDb = PostgresJsDatabase<any>

type DrizzleTx = Parameters<Parameters<DrizzleDb['transaction']>[0]>[0]
type InvoiceInsert = (typeof import('#core/accounting/drizzle/schema'))['invoices']['$inferInsert']
type InvoiceLineInsert =
  (typeof import('#core/accounting/drizzle/schema'))['invoiceLines']['$inferInsert']
type InvoiceLineWrite = Omit<InvoiceLineInsert, 'id' | 'invoiceId'>

type InvoiceMutableDraftWrite = Pick<
  InvoiceInsert,
  | 'customerCompanyAddressSnapshot'
  | 'customerCompanyName'
  | 'customerCompanySnapshot'
  | 'customerEmailSnapshot'
  | 'customerId'
  | 'customerPhoneSnapshot'
  | 'customerPrimaryContactSnapshot'
  | 'dueDate'
  | 'issueDate'
  | 'issuedCompanyAddress'
  | 'issuedCompanyName'
  | 'subtotalExclTaxCents'
  | 'totalInclTaxCents'
  | 'totalVatCents'
>

export async function loadCustomerSnapshotOrThrow(db: DrizzleDb | DrizzleTx, customerId: string) {
  const customer = await readCustomerSnapshot(db, customerId)
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

  const lines = await listInvoiceLinesForInvoice(db, input.invoiceId, requestContext.tenantId)

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

export function prepareDraftInvoiceWrite(input: {
  customer: CustomerSnapshotSource
  customerId: string
  dueDate: string
  issueDate: string
  issuedCompanyAddress: string
  issuedCompanyName: string
  totals: Pick<InvoiceInsert, 'subtotalExclTaxCents' | 'totalInclTaxCents' | 'totalVatCents'>
}): InvoiceMutableDraftWrite {
  return {
    customerCompanyName: input.customer.company,
    customerId: input.customerId,
    dueDate: input.dueDate,
    issueDate: input.issueDate,
    issuedCompanyAddress: input.issuedCompanyAddress,
    issuedCompanyName: input.issuedCompanyName,
    ...toCustomerSnapshot(input.customer),
    ...input.totals,
  }
}

export function prepareInvoiceLinesWrite(lines: NormalizedSaveInvoiceDraftInput['lines']): {
  lineValues: InvoiceLineWrite[]
  totals: Pick<InvoiceInsert, 'subtotalExclTaxCents' | 'totalInclTaxCents' | 'totalVatCents'>
} {
  const normalizedLines = lines.map(fromDisplayUnits)
  const calculatedLines = normalizedLines.map(calculateLine)

  return {
    lineValues: normalizedLines.map((line, index) => ({
      description: line.description,
      lineNumber: index + 1,
      quantityCents: line.quantityHundredths,
      unitPriceCents: line.unitPriceCents,
      vatRateCents: line.vatRateCents,
      ...calculatedLines[index],
    })),
    totals: calculateTotals(calculatedLines),
  }
}

export function prepareSendInvoiceWrite(input: {
  customer: CustomerSnapshotSource
  issuedCompanyAddress: string
  issuedCompanyName: string
}): Pick<
  InvoiceInsert,
  | 'customerCompanyAddressSnapshot'
  | 'customerCompanyName'
  | 'customerCompanySnapshot'
  | 'customerEmailSnapshot'
  | 'customerPhoneSnapshot'
  | 'customerPrimaryContactSnapshot'
  | 'issuedCompanyAddress'
  | 'issuedCompanyName'
> {
  return {
    customerCompanyName: input.customer.company,
    issuedCompanyAddress: input.issuedCompanyAddress,
    issuedCompanyName: input.issuedCompanyName,
    ...toCustomerSnapshot(input.customer),
  }
}

export async function recordInvoiceActivity(
  activitySink: AccountingActivitySink | undefined,
  requestContext: InvoiceRequestContext,
  operation: string,
  invoiceId: string
) {
  await activitySink?.record({
    actorId: requestContext.actorId,
    boundedContext: 'accounting',
    isAnonymous: requestContext.isAnonymous,
    operation,
    outcome: 'success',
    resourceId: invoiceId,
    resourceType: 'invoice',
  })
}

function getInvoiceTenantId(invoice: InvoiceRow): null | string | undefined {
  const candidate = invoice as InvoiceRow & { tenantId?: null | string }
  return candidate.tenantId
}
