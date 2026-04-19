import { DomainError } from '#core/common/errors/domain_error'

import type { IssueInvoiceInput, NormalizedIssueInvoiceInput } from '../../types.js'

export function normalizeIssueInvoiceInput(input: IssueInvoiceInput): NormalizedIssueInvoiceInput {
  const issuedCompanyAddress = input.issuedCompanyAddress.trim()
  const issuedCompanyName = input.issuedCompanyName.trim()

  if (!issuedCompanyName || !issuedCompanyAddress) {
    throw new DomainError('Company name and company address are required to issue.', 'invalid_data')
  }

  return {
    issuedCompanyAddress,
    issuedCompanyName,
  }
}
