import { SYSTEM_ACCOUNTING_ACCESS_CONTEXT } from '#core/accounting/application/support/access_context'

import type { InvoiceConcurrencyHooks, InvoiceDto, InvoiceRequestContext } from '../types.js'

import { updateInvoiceStatus } from '../db/invoice_commands.js'
import { assertInvoiceCanBeMarkedPaid } from '../domain/invoice_rules.js'
import {
  type InvoiceUseCaseDeps,
  loadInvoiceDto,
  loadInvoiceForMutationOrThrow,
  recordInvoiceActivity,
} from './use_case_support.js'

export async function markInvoicePaidUseCase(
  deps: InvoiceUseCaseDeps,
  id: string,
  hooks?: InvoiceConcurrencyHooks,
  requestContext: InvoiceRequestContext = SYSTEM_ACCOUNTING_ACCESS_CONTEXT
): Promise<InvoiceDto> {
  const result = await deps.db.transaction(async (tx) => {
    const existing = await loadInvoiceForMutationOrThrow(tx, id, requestContext)
    assertInvoiceCanBeMarkedPaid(existing.status)
    await hooks?.afterRead?.()

    const updated = await updateInvoiceStatus(tx, id, 'issued', 'paid')
    if (!updated) {
      const again = await loadInvoiceForMutationOrThrow(tx, id, requestContext)
      assertInvoiceCanBeMarkedPaid(again.status)
    }

    return loadInvoiceDto(
      tx,
      deps.businessCalendar,
      { invoice: updated!, invoiceId: id },
      requestContext
    )
  })

  await recordInvoiceActivity(deps.activitySink, requestContext, 'mark_invoice_paid', id)

  return result
}
