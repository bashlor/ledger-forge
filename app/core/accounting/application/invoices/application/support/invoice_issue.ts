import { DomainError } from '#core/common/errors/domain_error'

import type {
  InvoiceConcurrencyHooks,
  InvoiceRequestContext,
  IssueInvoiceInput,
} from '../../types.js'
import type { InvoiceUseCaseDeps } from './invoice_use_case_deps.js'

import { buildInvoiceIssueMutation } from '../../domain/invoice_mutations.js'
import { assertInvoiceCanBeIssuedToday } from '../../domain/invoice_rules.js'
import {
  insertInvoiceJournalEntry,
  updateInvoice,
  updateInvoiceStatus,
} from '../../infrastructure/invoice_commands.js'
import { normalizeIssueInvoiceInput } from '../validators/issue_invoice_input.js'
import { loadCustomerSnapshotOrThrow, loadInvoiceForMutationOrThrow } from './invoice_snapshot.js'

type DrizzleTx = Parameters<Parameters<InvoiceUseCaseDeps['db']['transaction']>[0]>[0]

export async function loadInvoiceIssueContext(
  tx: DrizzleTx,
  deps: InvoiceUseCaseDeps,
  id: string,
  input: IssueInvoiceInput,
  requestContext: InvoiceRequestContext
) {
  const existing = await loadInvoiceForMutationOrThrow(tx, id, requestContext)
  const normalized = normalizeIssueInvoiceInput(input)
  const today = deps.businessCalendar.today()

  assertInvoiceCanBeIssuedToday(existing.status, existing.dueDate, today)

  return {
    customer: await loadCustomerSnapshotOrThrow(tx, existing.customerId, requestContext.tenantId),
    existing,
    normalized,
    today,
  }
}

export async function persistInvoiceIssue(
  tx: DrizzleTx,
  deps: InvoiceUseCaseDeps,
  id: string,
  context: Awaited<ReturnType<typeof loadInvoiceIssueContext>>,
  requestContext: InvoiceRequestContext,
  hooks?: InvoiceConcurrencyHooks
) {
  await hooks?.afterRead?.()

  const transitioned = await updateInvoiceStatus(tx, id, 'draft', 'issued', requestContext.tenantId)
  if (!transitioned) {
    const again = await loadInvoiceForMutationOrThrow(tx, id, requestContext)
    assertInvoiceCanBeIssuedToday(again.status, again.dueDate, context.today)
  }

  const invoice = await updateInvoice(
    tx,
    id,
    {
      ...buildInvoiceIssueMutation({
        customer: context.customer,
        issuedCompanyAddress: context.normalized.issuedCompanyAddress,
        issuedCompanyName: context.normalized.issuedCompanyName,
      }),
    },
    requestContext.tenantId
  )
  if (!invoice) throw new DomainError('Invoice not found.', 'not_found')

  await insertInvoiceJournalEntry(tx, {
    amountCents: invoice.totalInclTaxCents,
    date: invoice.issueDate,
    invoiceId: id,
    label: `Invoice ${invoice.invoiceNumber}`,
    organizationId: requestContext.tenantId,
  })

  await deps.auditTrail.record(tx, {
    action: 'issue',
    actorId: requestContext.actorId,
    changes: { after: { status: 'issued' }, before: { status: 'draft' } },
    entityId: id,
    entityType: 'invoice',
    tenantId: requestContext.tenantId,
  })

  return { invoice, invoiceId: id }
}
