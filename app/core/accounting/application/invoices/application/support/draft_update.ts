import type {
  InvoiceConcurrencyHooks,
  InvoiceRequestContext,
  SaveInvoiceDraftInput,
} from '../../types.js'
import type { InvoiceUseCaseDeps } from './invoice_use_case_deps.js'

import {
  buildDraftInvoiceLinesMutation,
  buildDraftInvoiceMutation,
} from '../../domain/invoice_mutations.js'
import { assertDraftCanBeUpdated } from '../../domain/invoice_rules.js'
import { replaceInvoiceLines, updateInvoice } from '../../infrastructure/invoice_commands.js'
import { normalizeSaveInvoiceDraftInput } from '../validators/save_invoice_draft_input.js'
import { loadCustomerSnapshotOrThrow, loadInvoiceForMutationOrThrow } from './invoice_snapshot.js'

type DrizzleTx = Parameters<Parameters<InvoiceUseCaseDeps['db']['transaction']>[0]>[0]

export async function loadDraftUpdateContext(
  tx: DrizzleTx,
  deps: InvoiceUseCaseDeps,
  id: string,
  input: SaveInvoiceDraftInput,
  requestContext: InvoiceRequestContext
) {
  const normalized = normalizeSaveInvoiceDraftInput(input)
  const existing = await loadInvoiceForMutationOrThrow(tx, id, requestContext)
  const createdAt = deps.businessCalendar.dateFromTimestamp(existing.createdAt)

  assertDraftCanBeUpdated({
    createdAt,
    dueDate: normalized.dueDate,
    issueDate: normalized.issueDate,
    status: existing.status,
  })

  return {
    createdAt,
    customer: await loadCustomerSnapshotOrThrow(tx, normalized.customerId),
    existing,
    normalized,
  }
}

export async function persistDraftUpdate(
  tx: DrizzleTx,
  id: string,
  context: Awaited<ReturnType<typeof loadDraftUpdateContext>>,
  requestContext: InvoiceRequestContext,
  hooks?: InvoiceConcurrencyHooks
) {
  await hooks?.afterRead?.()

  const preparedLines = buildDraftInvoiceLinesMutation(context.normalized.lines)
  const invoice = await updateInvoice(tx, id, {
    ...buildDraftInvoiceMutation({
      customer: context.customer,
      customerId: context.normalized.customerId,
      dueDate: context.normalized.dueDate,
      issueDate: context.normalized.issueDate,
      issuedCompanyAddress: context.existing.issuedCompanyAddress,
      issuedCompanyName: context.existing.issuedCompanyName,
      totals: preparedLines.totals,
    }),
  })

  if (!invoice || invoice.status !== 'draft') {
    const again = await loadInvoiceForMutationOrThrow(tx, id, requestContext)
    assertDraftCanBeUpdated({
      createdAt: context.createdAt,
      dueDate: context.normalized.dueDate,
      issueDate: context.normalized.issueDate,
      status: again.status,
    })
  }

  await replaceInvoiceLines(tx, id, preparedLines.lineValues)

  return { invoice: invoice!, invoiceId: id }
}
