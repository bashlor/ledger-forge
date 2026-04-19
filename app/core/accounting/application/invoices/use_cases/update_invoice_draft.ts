import { SYSTEM_ACCOUNTING_ACCESS_CONTEXT } from '#core/accounting/application/support/access_context'

import type {
  InvoiceConcurrencyHooks,
  InvoiceDto,
  InvoiceRequestContext,
  SaveInvoiceDraftInput,
} from '../types.js'

import { replaceInvoiceLines, updateInvoice } from '../db/invoice_commands.js'
import {
  assertInvoiceDateIsValidForBusinessRules,
  assertInvoiceDueDateIsNotBefore,
  assertInvoiceIsDraft,
} from '../domain/invoice_rules.js'
import { normalizeSaveInvoiceDraftInput } from '../validation.js'
import {
  type InvoiceUseCaseDeps,
  loadCustomerSnapshotOrThrow,
  loadInvoiceDto,
  loadInvoiceForMutationOrThrow,
  prepareDraftInvoiceWrite,
  prepareInvoiceLinesWrite,
  recordInvoiceActivity,
} from './use_case_support.js'

export async function updateInvoiceDraftUseCase(
  deps: InvoiceUseCaseDeps,
  id: string,
  input: SaveInvoiceDraftInput,
  hooks?: InvoiceConcurrencyHooks,
  requestContext: InvoiceRequestContext = SYSTEM_ACCOUNTING_ACCESS_CONTEXT
): Promise<InvoiceDto> {
  const result = await deps.db.transaction(async (tx) => {
    const normalized = validateDraftUpdateInput(input)
    const existing = await getDraftInvoiceForMutation(
      tx,
      id,
      deps.businessCalendar,
      normalized,
      requestContext
    )
    await hooks?.afterRead?.()
    const customer = await loadCustomerSnapshotOrThrow(tx, normalized.customerId)
    const preparedLines = prepareInvoiceLinesWrite(normalized.lines)

    const updated = await updateInvoice(tx, id, {
      ...prepareDraftInvoiceWrite({
        customer,
        customerId: normalized.customerId,
        dueDate: normalized.dueDate,
        issueDate: normalized.issueDate,
        issuedCompanyAddress: existing.issuedCompanyAddress,
        issuedCompanyName: existing.issuedCompanyName,
        totals: preparedLines.totals,
      }),
    })

    if (!updated || updated.status !== 'draft') {
      const again = await loadInvoiceForMutationOrThrow(tx, id, requestContext)
      assertInvoiceIsDraft(again.status)
    }

    await replaceInvoiceLines(tx, id, preparedLines.lineValues)

    return loadInvoiceDto(
      tx,
      deps.businessCalendar,
      { invoice: updated!, invoiceId: id },
      requestContext
    )
  })

  await recordInvoiceActivity(deps.activitySink, requestContext, 'update_invoice_draft', id)

  return result
}

async function getDraftInvoiceForMutation(
  tx: Parameters<Parameters<InvoiceUseCaseDeps['db']['transaction']>[0]>[0],
  id: string,
  businessCalendar: InvoiceUseCaseDeps['businessCalendar'],
  normalized: ReturnType<typeof validateDraftUpdateInput>,
  requestContext: InvoiceRequestContext
) {
  const existing = await loadInvoiceForMutationOrThrow(tx, id, requestContext)
  assertInvoiceIsDraft(existing.status)
  assertInvoiceDueDateIsNotBefore(
    normalized.dueDate,
    businessCalendar.dateFromTimestamp(existing.createdAt),
    'Due date must be on or after the draft creation date.'
  )
  return existing
}

function validateDraftUpdateInput(input: SaveInvoiceDraftInput) {
  const normalized = normalizeSaveInvoiceDraftInput(input)
  assertInvoiceDateIsValidForBusinessRules(normalized.issueDate, normalized.dueDate)
  return normalized
}
