import { SYSTEM_ACCOUNTING_ACCESS_CONTEXT } from '#core/accounting/application/support/access_context'

import type { InvoiceRequestContext } from '../types.js'
import type { InvoiceUseCaseDeps } from './support/invoice_use_case_deps.js'

import {
  loadInvoiceCancellationContext,
  persistInvoiceCancellation,
} from './support/invoice_cancellation.js'
import { recordInvoiceActivity } from './support/record_invoice_activity.js'

export async function cancelInvoiceUseCase(
  deps: InvoiceUseCaseDeps,
  id: string,
  requestContext: InvoiceRequestContext = SYSTEM_ACCOUNTING_ACCESS_CONTEXT
): Promise<void> {
  await deps.db.transaction(async (tx) => {
    await loadInvoiceCancellationContext(tx, id, requestContext)
    await persistInvoiceCancellation(tx, id, requestContext)
  })

  await recordInvoiceActivity(deps.activitySink, requestContext, 'delete_invoice_draft', id)
}
