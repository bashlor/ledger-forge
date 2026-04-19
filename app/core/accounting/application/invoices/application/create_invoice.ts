import { SYSTEM_ACCOUNTING_ACCESS_CONTEXT } from '#core/accounting/application/support/access_context'

import type { InvoiceDto, InvoiceRequestContext, SaveInvoiceDraftInput } from '../types.js'
import type { InvoiceUseCaseDeps } from './support/invoice_use_case_deps.js'

import { loadDraftCreationContext, persistDraftCreation } from './support/draft_creation.js'
import { loadInvoiceDto } from './support/invoice_snapshot.js'
import { recordInvoiceActivity } from './support/record_invoice_activity.js'

export async function createInvoiceUseCase(
  deps: InvoiceUseCaseDeps,
  input: SaveInvoiceDraftInput,
  requestContext: InvoiceRequestContext = SYSTEM_ACCOUNTING_ACCESS_CONTEXT
): Promise<InvoiceDto> {
  const result = await deps.db.transaction(async (tx) => {
    const context = await loadDraftCreationContext(tx, deps, input)
    const created = await persistDraftCreation(tx, context, requestContext)
    return loadInvoiceDto(tx, deps.businessCalendar, created, requestContext)
  })

  await recordInvoiceActivity(deps.activitySink, requestContext, 'create_invoice_draft', result.id)

  return result
}
