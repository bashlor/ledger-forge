import { SYSTEM_ACCOUNTING_ACCESS_CONTEXT } from '#core/accounting/application/support/access_context'

import type {
  InvoiceConcurrencyHooks,
  InvoiceDto,
  InvoiceRequestContext,
  IssueInvoiceInput,
} from '../types.js'
import type { InvoiceUseCaseDeps } from './support/invoice_use_case_deps.js'

import { loadInvoiceIssueContext, persistInvoiceIssue } from './support/invoice_issue.js'
import { loadInvoiceDto } from './support/invoice_snapshot.js'
import { recordInvoiceActivity } from './support/record_invoice_activity.js'

export async function sendInvoiceUseCase(
  deps: InvoiceUseCaseDeps,
  id: string,
  input: IssueInvoiceInput,
  hooks?: InvoiceConcurrencyHooks,
  requestContext: InvoiceRequestContext = SYSTEM_ACCOUNTING_ACCESS_CONTEXT
): Promise<InvoiceDto> {
  const result = await deps.db.transaction(async (tx) => {
    const context = await loadInvoiceIssueContext(tx, deps, id, input, requestContext)
    const issued = await persistInvoiceIssue(tx, id, context, requestContext, hooks)
    return loadInvoiceDto(tx, deps.businessCalendar, issued, requestContext)
  })

  await recordInvoiceActivity(deps.activitySink, requestContext, 'issue_invoice', id)

  return result
}
