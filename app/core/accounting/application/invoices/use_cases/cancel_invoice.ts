import { SYSTEM_ACCOUNTING_ACCESS_CONTEXT } from '#core/accounting/application/support/access_context'

import type { InvoiceRequestContext } from '../types.js'

import { deleteDraftInvoice } from '../db/invoice_commands.js'
import { assertInvoiceIsDraft } from '../domain/invoice_rules.js'
import {
  type InvoiceUseCaseDeps,
  loadInvoiceForMutationOrThrow,
  recordInvoiceActivity,
} from './use_case_support.js'

export async function cancelInvoiceUseCase(
  deps: InvoiceUseCaseDeps,
  id: string,
  requestContext: InvoiceRequestContext = SYSTEM_ACCOUNTING_ACCESS_CONTEXT
): Promise<void> {
  await deps.db.transaction(async (tx) => {
    const deleted = await deleteDraftInvoice(tx, id)
    if (!deleted) {
      const existing = await loadInvoiceForMutationOrThrow(tx, id, requestContext)
      assertInvoiceIsDraft(existing.status, 'Only draft invoices can be deleted.')
    }
  })

  await recordInvoiceActivity(deps.activitySink, requestContext, 'delete_invoice_draft', id)
}
