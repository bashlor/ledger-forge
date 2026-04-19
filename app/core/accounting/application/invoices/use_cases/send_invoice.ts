import { SYSTEM_ACCOUNTING_ACCESS_CONTEXT } from '#core/accounting/application/support/access_context'
import { DomainError } from '#core/common/errors/domain_error'

import type {
  InvoiceConcurrencyHooks,
  InvoiceDto,
  InvoiceRequestContext,
  IssueInvoiceInput,
} from '../types.js'

import {
  insertInvoiceJournalEntry,
  updateInvoice,
  updateInvoiceStatus,
} from '../db/invoice_commands.js'
import {
  assertInvoiceCanBeSent,
  assertInvoiceDueDateIsNotBefore,
  assertInvoiceIsDraft,
} from '../domain/invoice_rules.js'
import { normalizeIssueInvoiceInput } from '../validation.js'
import {
  getInvoiceForUpdateOrThrow,
  type InvoiceUseCaseDeps,
  loadCustomerSnapshotOrThrow,
  loadInvoiceDto,
  prepareSendInvoiceWrite,
  recordInvoiceActivity,
} from './use_case_support.js'

export async function sendInvoiceUseCase(
  deps: InvoiceUseCaseDeps,
  id: string,
  input: IssueInvoiceInput,
  hooks?: InvoiceConcurrencyHooks,
  requestContext: InvoiceRequestContext = SYSTEM_ACCOUNTING_ACCESS_CONTEXT
): Promise<InvoiceDto> {
  const result = await deps.db.transaction(async (tx) => {
    const existing = await getInvoiceForUpdateOrThrow(tx, id, requestContext)
    assertInvoiceCanBeSent(existing.status)
    await hooks?.afterRead?.()

    const normalized = normalizeIssueInvoiceInput(input)
    assertInvoiceDueDateIsNotBefore(
      existing.dueDate,
      deps.businessCalendar.today(),
      'Due date must be today or later to issue an invoice.'
    )

    const customer = await loadCustomerSnapshotOrThrow(tx, existing.customerId)
    const lockedStatusUpdate = await updateInvoiceStatus(tx, id, 'draft', 'issued')
    if (!lockedStatusUpdate) {
      const again = await getInvoiceForUpdateOrThrow(tx, id, requestContext)
      assertInvoiceIsDraft(again.status, 'Only draft invoices can be issued.')
    }

    const updated = await updateInvoice(tx, id, {
      ...prepareSendInvoiceWrite({
        customer,
        issuedCompanyAddress: normalized.issuedCompanyAddress,
        issuedCompanyName: normalized.issuedCompanyName,
      }),
    })
    if (!updated) throw new DomainError('Invoice not found.', 'not_found')

    await insertInvoiceJournalEntry(tx, {
      amountCents: updated.totalInclTaxCents,
      date: updated.issueDate,
      invoiceId: id,
      label: `Invoice ${updated.invoiceNumber}`,
    })

    return loadInvoiceDto(
      tx,
      deps.businessCalendar,
      { invoice: updated, invoiceId: id },
      requestContext
    )
  })

  await recordInvoiceActivity(deps.activitySink, requestContext, 'issue_invoice', id)

  return result
}
