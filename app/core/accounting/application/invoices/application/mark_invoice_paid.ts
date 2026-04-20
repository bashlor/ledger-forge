import type { InvoiceConcurrencyHooks, InvoiceDto, InvoiceRequestContext } from '../types.js'
import type { InvoiceUseCaseDeps } from './support/invoice_use_case_deps.js'

import { loadInvoicePaymentContext, persistInvoicePayment } from './support/invoice_payment.js'
import { loadInvoiceDto } from './support/invoice_snapshot.js'
import { recordInvoiceActivity } from './support/record_invoice_activity.js'

export async function markInvoicePaidUseCase(
  deps: InvoiceUseCaseDeps,
  id: string,
  requestContext: InvoiceRequestContext,
  hooks?: InvoiceConcurrencyHooks
): Promise<InvoiceDto> {
  const result = await deps.db.transaction(async (tx) => {
    await loadInvoicePaymentContext(tx, id, requestContext)
    const paid = await persistInvoicePayment(tx, id, requestContext, hooks)
    return loadInvoiceDto(tx, deps.businessCalendar, paid, requestContext)
  })

  await recordInvoiceActivity(deps.activitySink, requestContext, 'mark_invoice_paid', id)

  return result
}
