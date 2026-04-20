import { v7 as uuidv7 } from 'uuid'

import type { InvoiceRequestContext, SaveInvoiceDraftInput } from '../../types.js'
import type { InvoiceUseCaseDeps } from './invoice_use_case_deps.js'

import {
  buildDraftInvoiceLinesMutation,
  buildDraftInvoiceMutation,
} from '../../domain/invoice_mutations.js'
import { assertDraftCanBeCreatedToday } from '../../domain/invoice_rules.js'
import { insertInvoice, insertInvoiceLines } from '../../infrastructure/invoice_commands.js'
import { nextInvoiceNumber } from '../../infrastructure/invoice_queries.js'
import { normalizeSaveInvoiceDraftInput } from '../validators/save_invoice_draft_input.js'
import { loadCustomerSnapshotOrThrow } from './invoice_snapshot.js'

type DrizzleTx = Parameters<Parameters<InvoiceUseCaseDeps['db']['transaction']>[0]>[0]

export async function loadDraftCreationContext(
  tx: DrizzleTx,
  deps: InvoiceUseCaseDeps,
  input: SaveInvoiceDraftInput,
  requestContext: InvoiceRequestContext
) {
  const normalized = normalizeSaveInvoiceDraftInput(input)
  assertDraftCanBeCreatedToday(
    normalized.issueDate,
    normalized.dueDate,
    deps.businessCalendar.today()
  )

  return {
    customer: await loadCustomerSnapshotOrThrow(tx, normalized.customerId, requestContext.tenantId),
    invoiceId: uuidv7(),
    invoiceNumber: await nextInvoiceNumber(tx, normalized.issueDate),
    normalized,
  }
}

export async function persistDraftCreation(
  tx: DrizzleTx,
  context: Awaited<ReturnType<typeof loadDraftCreationContext>>,
  requestContext: InvoiceRequestContext
) {
  const preparedLines = buildDraftInvoiceLinesMutation(context.normalized.lines)
  const invoice = await insertInvoice(tx, {
    createdBy: requestContext.actorId ?? null,
    id: context.invoiceId,
    invoiceNumber: context.invoiceNumber,
    organizationId: requestContext.tenantId ?? null,
    status: 'draft',
    ...buildDraftInvoiceMutation({
      customer: context.customer,
      customerId: context.normalized.customerId,
      dueDate: context.normalized.dueDate,
      issueDate: context.normalized.issueDate,
      issuedCompanyAddress: '',
      issuedCompanyName: '',
      totals: preparedLines.totals,
    }),
  })

  await insertInvoiceLines(
    tx,
    preparedLines.lineValues.map((line) => ({
      id: uuidv7(),
      invoiceId: context.invoiceId,
      ...line,
    }))
  )

  return { invoice, invoiceId: context.invoiceId }
}
