import type { InvoiceRequestContext } from '../../types.js'
import type { InvoiceUseCaseDeps } from './invoice_use_case_deps.js'

import { insertAuditEvent } from '../../../audit/audit_writer.js'
import { assertDraftCanBeCanceled } from '../../domain/invoice_rules.js'
import { deleteDraftInvoice } from '../../infrastructure/invoice_commands.js'
import { loadInvoiceForMutationOrThrow } from './invoice_snapshot.js'

type DrizzleTx = Parameters<Parameters<InvoiceUseCaseDeps['db']['transaction']>[0]>[0]

export async function loadInvoiceCancellationContext(
  tx: DrizzleTx,
  id: string,
  requestContext: InvoiceRequestContext
) {
  const existing = await loadInvoiceForMutationOrThrow(tx, id, requestContext)
  assertDraftCanBeCanceled(existing.status)
  return { existing }
}

export async function persistInvoiceCancellation(
  tx: DrizzleTx,
  id: string,
  requestContext: InvoiceRequestContext
) {
  const deleted = await deleteDraftInvoice(tx, id, requestContext.tenantId)
  if (!deleted) {
    const again = await loadInvoiceForMutationOrThrow(tx, id, requestContext)
    assertDraftCanBeCanceled(again.status, 'Only draft invoices can be deleted.')
  }

  await insertAuditEvent(tx, {
    action: 'delete_draft',
    actorId: requestContext.actorId,
    entityId: id,
    entityType: 'invoice',
    tenantId: requestContext.tenantId,
  })
}
