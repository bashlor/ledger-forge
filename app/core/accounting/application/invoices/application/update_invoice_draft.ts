import type {
  InvoiceConcurrencyHooks,
  InvoiceDto,
  InvoiceRequestContext,
  SaveInvoiceDraftInput,
} from '../types.js'
import type { InvoiceUseCaseDeps } from './support/invoice_use_case_deps.js'

import { loadDraftUpdateContext, persistDraftUpdate } from './support/draft_update.js'
import { loadInvoiceDto } from './support/invoice_snapshot.js'
import { recordInvoiceActivity } from './support/record_invoice_activity.js'

export async function updateInvoiceDraftUseCase(
  deps: InvoiceUseCaseDeps,
  id: string,
  input: SaveInvoiceDraftInput,
  requestContext: InvoiceRequestContext,
  hooks?: InvoiceConcurrencyHooks
): Promise<InvoiceDto> {
  const result = await deps.db.transaction(async (tx) => {
    const context = await loadDraftUpdateContext(tx, deps, id, input, requestContext)
    const updated = await persistDraftUpdate(tx, id, context, requestContext, hooks)
    return loadInvoiceDto(tx, deps.businessCalendar, updated, requestContext)
  })

  await recordInvoiceActivity(deps.activitySink, requestContext, 'update_invoice_draft', id)

  return result
}
