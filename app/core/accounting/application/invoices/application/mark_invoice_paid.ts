import { SYSTEM_ACCOUNTING_ACCESS_CONTEXT } from '#core/accounting/application/support/access_context'

import type { InvoiceConcurrencyHooks, InvoiceDto, InvoiceRequestContext } from '../types.js'
import type { InvoiceUseCaseDeps } from './support/invoice_use_case_deps.js'

import { loadInvoicePaymentContext, persistInvoicePayment } from './support/invoice_payment.js'
import { loadInvoiceDto } from './support/invoice_snapshot.js'
import { recordInvoiceActivity } from './support/record_invoice_activity.js'

export async function markInvoicePaidUseCase(
  deps: InvoiceUseCaseDeps,
  id: string,
  hooks?: InvoiceConcurrencyHooks,
  requestContext: InvoiceRequestContext = SYSTEM_ACCOUNTING_ACCESS_CONTEXT
): Promise<InvoiceDto> {
  const result = await deps.db.transaction(async (tx) => {
    await loadInvoicePaymentContext(tx, id, requestContext)
    const paid = await persistInvoicePayment(tx, id, requestContext, hooks)
    return loadInvoiceDto(tx, deps.businessCalendar, paid, requestContext)
  })

  await recordInvoiceActivity(deps.activitySink, requestContext, 'mark_invoice_paid', id)

  return result
}
