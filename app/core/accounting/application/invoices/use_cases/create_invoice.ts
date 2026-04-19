import { SYSTEM_ACCOUNTING_ACCESS_CONTEXT } from '#core/accounting/application/support/access_context'
import { v7 as uuidv7 } from 'uuid'

import type { InvoiceDto, InvoiceRequestContext, SaveInvoiceDraftInput } from '../types.js'

import { insertInvoice, insertInvoiceLines } from '../db/invoice_commands.js'
import { nextInvoiceNumber } from '../db/invoice_queries.js'
import {
  assertInvoiceDateIsValidForBusinessRules,
  assertInvoiceDueDateIsNotBefore,
} from '../domain/invoice_rules.js'
import { normalizeSaveInvoiceDraftInput } from '../validation.js'
import {
  type InvoiceUseCaseDeps,
  loadCustomerSnapshotOrThrow,
  loadInvoiceDto,
  prepareDraftInvoiceWrite,
  prepareInvoiceLinesWrite,
  recordInvoiceActivity,
} from './use_case_support.js'

export async function createInvoiceUseCase(
  deps: InvoiceUseCaseDeps,
  input: SaveInvoiceDraftInput,
  requestContext: InvoiceRequestContext = SYSTEM_ACCOUNTING_ACCESS_CONTEXT
): Promise<InvoiceDto> {
  const result = await deps.db.transaction(async (tx) => {
    const normalized = normalizeSaveInvoiceDraftInput(input)
    assertInvoiceDateIsValidForBusinessRules(normalized.issueDate, normalized.dueDate)
    assertInvoiceDueDateIsNotBefore(
      normalized.dueDate,
      deps.businessCalendar.today(),
      'Due date must be on or after the draft creation date.'
    )

    const customer = await loadCustomerSnapshotOrThrow(tx, normalized.customerId)
    const invoiceId = uuidv7()
    const invoiceNumber = await nextInvoiceNumber(tx, normalized.issueDate)
    const preparedLines = prepareInvoiceLinesWrite(normalized.lines)

    const created = await insertInvoice(tx, {
      id: invoiceId,
      invoiceNumber,
      status: 'draft',
      ...prepareDraftInvoiceWrite({
        customer,
        customerId: normalized.customerId,
        dueDate: normalized.dueDate,
        issueDate: normalized.issueDate,
        issuedCompanyAddress: '',
        issuedCompanyName: '',
        totals: preparedLines.totals,
      }),
    })

    await insertInvoiceLines(
      tx,
      preparedLines.lineValues.map((line) => ({
        id: uuidv7(),
        invoiceId,
        ...line,
      }))
    )

    return loadInvoiceDto(
      tx,
      deps.businessCalendar,
      { invoice: created, invoiceId },
      requestContext
    )
  })

  await recordInvoiceActivity(deps.activitySink, requestContext, 'create_invoice_draft', result.id)

  return result
}
