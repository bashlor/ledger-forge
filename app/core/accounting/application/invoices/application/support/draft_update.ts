import type {
  InvoiceConcurrencyHooks,
  InvoiceLineDto,
  InvoiceRequestContext,
  SaveInvoiceDraftInput,
} from '../../types.js'
import type { InvoiceUseCaseDeps } from './invoice_use_case_deps.js'

import {
  buildDraftInvoiceLinesMutation,
  buildDraftInvoiceMutation,
} from '../../domain/invoice_mutations.js'
import { assertDraftCanBeUpdated } from '../../domain/invoice_rules.js'
import { replaceInvoiceLines, updateInvoiceDraft } from '../../infrastructure/invoice_commands.js'
import { toLineDto } from '../../infrastructure/invoice_mappers.js'
import { listInvoiceLinesForInvoice } from '../../infrastructure/invoice_queries.js'
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
  const existingLineRows = await listInvoiceLinesForInvoice(tx, {
    invoiceId: id,
    tenantId: requestContext.tenantId,
  })
  const createdAt = deps.businessCalendar.dateFromTimestamp(existing.createdAt)

  assertDraftCanBeUpdated({
    createdAt,
    dueDate: normalized.dueDate,
    issueDate: normalized.issueDate,
    status: existing.status,
  })

  return {
    createdAt,
    customer: await loadCustomerSnapshotOrThrow(tx, normalized.customerId, requestContext.tenantId),
    existing,
    existingLines: existingLineRows.map(toLineDto),
    normalized,
  }
}

export async function persistDraftUpdate(
  tx: DrizzleTx,
  deps: InvoiceUseCaseDeps,
  id: string,
  context: Awaited<ReturnType<typeof loadDraftUpdateContext>>,
  requestContext: InvoiceRequestContext,
  hooks?: InvoiceConcurrencyHooks
) {
  await hooks?.afterRead?.()

  const preparedLines = buildDraftInvoiceLinesMutation(context.normalized.lines)
  const invoice = await updateInvoiceDraft(
    tx,
    id,
    {
      ...buildDraftInvoiceMutation({
        customer: context.customer,
        customerId: context.normalized.customerId,
        dueDate: context.normalized.dueDate,
        issueDate: context.normalized.issueDate,
        issuedCompanyAddress: context.existing.issuedCompanyAddress,
        issuedCompanyName: context.existing.issuedCompanyName,
        totals: preparedLines.totals,
      }),
    },
    requestContext.tenantId
  )

  if (!invoice || invoice.status !== 'draft') {
    const again = await loadInvoiceForMutationOrThrow(tx, id, requestContext)
    assertDraftCanBeUpdated({
      createdAt: context.createdAt,
      dueDate: context.normalized.dueDate,
      issueDate: context.normalized.issueDate,
      status: again.status,
    })
  }

  await replaceInvoiceLines(tx, id, requestContext.tenantId, preparedLines.lineValues)

  await deps.auditTrail.record(tx, {
    action: 'update_draft',
    actorId: requestContext.actorId,
    changes: {
      after: {
        customerId: context.normalized.customerId,
        dueDate: context.normalized.dueDate,
        issueDate: context.normalized.issueDate,
        lines: summarizeDraftLines(preparedLines.lineValues),
      },
      before: {
        customerId: context.existing.customerId,
        dueDate: context.existing.dueDate,
        issueDate: context.existing.issueDate,
        lines: summarizeExistingLines(context.existingLines),
      },
    },
    entityId: id,
    entityType: 'invoice',
    tenantId: requestContext.tenantId,
  })

  return { invoice: invoice!, invoiceId: id }
}

function summarizeDraftLines(
  lines: Array<{
    description: string
    lineNumber: number
    lineTotalExclTaxCents: number
    lineTotalInclTaxCents: number
    lineTotalVatCents: number
    quantityCents: number
    unitPriceCents: number
    vatRateCents: number
  }>
) {
  return lines.map((line) => ({
    description: line.description,
    lineNumber: line.lineNumber,
    lineTotalExclTax: line.lineTotalExclTaxCents / 100,
    lineTotalInclTax: line.lineTotalInclTaxCents / 100,
    lineVatAmount: line.lineTotalVatCents / 100,
    quantity: line.quantityCents / 100,
    unitPrice: line.unitPriceCents / 100,
    vatRate: line.vatRateCents / 100,
  }))
}

function summarizeExistingLines(lines: InvoiceLineDto[]) {
  return lines.map((line, index) => ({
    description: line.description,
    lineNumber: index + 1,
    lineTotalExclTax: line.lineTotalExclTax,
    lineTotalInclTax: line.lineTotalInclTax,
    lineVatAmount: line.lineVatAmount,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    vatRate: line.vatRate,
  }))
}
