import type { InvoiceConcurrencyHooks, InvoiceRequestContext } from '../../types.js'
import type { InvoiceUseCaseDeps } from './invoice_use_case_deps.js'

import { insertAuditEvent } from '../../../audit/audit_writer.js'
import { assertInvoiceCanBeMarkedPaidNow } from '../../domain/invoice_rules.js'
import { updateInvoiceStatus } from '../../infrastructure/invoice_commands.js'
import { loadInvoiceForMutationOrThrow } from './invoice_snapshot.js'

type DrizzleTx = Parameters<Parameters<InvoiceUseCaseDeps['db']['transaction']>[0]>[0]

export async function loadInvoicePaymentContext(
  tx: DrizzleTx,
  id: string,
  requestContext: InvoiceRequestContext
) {
  const existing = await loadInvoiceForMutationOrThrow(tx, id, requestContext)
  assertInvoiceCanBeMarkedPaidNow(existing.status)
  return { existing }
}

export async function persistInvoicePayment(
  tx: DrizzleTx,
  id: string,
  requestContext: InvoiceRequestContext,
  hooks?: InvoiceConcurrencyHooks
) {
  await hooks?.afterRead?.()

  const invoice = await updateInvoiceStatus(tx, id, 'issued', 'paid', requestContext.tenantId)
  if (!invoice) {
    const again = await loadInvoiceForMutationOrThrow(tx, id, requestContext)
    assertInvoiceCanBeMarkedPaidNow(again.status)
  }

  await insertAuditEvent(tx, {
    action: 'mark_paid',
    actorId: requestContext.actorId,
    changes: { after: { status: 'paid' }, before: { status: 'issued' } },
    entityId: id,
    entityType: 'invoice',
    tenantId: requestContext.tenantId,
  })

  return { invoice: invoice!, invoiceId: id }
}
