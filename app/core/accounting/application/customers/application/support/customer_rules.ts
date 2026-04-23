import {
  clampInteger,
  MAX_LIST_PER_PAGE,
  MIN_LIST_PER_PAGE,
} from '#core/accounting/application/support/pagination'
import { DomainError } from '#core/common/errors/domain_error'

import type { CreateCustomerInput, CustomerRow, NormalizedCustomerInput } from '../../types.js'

import { normalizeCustomerInput } from '../../validation.js'

export interface NormalizedCustomerListInput {
  page: number
  perPage: number
  search?: string
}

export function buildDeleteCustomerError(
  state: undefined | { id: string; invoiceCount: number }
): DomainError {
  if (!state) {
    return new DomainError('Customer not found.', 'not_found')
  }

  if (state.invoiceCount > 0) {
    return new DomainError(
      'This customer is referenced by one or more invoices.',
      'business_logic_error'
    )
  }

  return new DomainError('Customer not found.', 'not_found')
}

export function customerSnapshotChanged(
  existing: CustomerRow,
  normalized: NormalizedCustomerInput
): boolean {
  return (
    existing.address !== normalized.address ||
    existing.company !== normalized.company ||
    existing.email !== normalized.email ||
    existing.name !== normalized.name ||
    existing.phone !== normalized.phone
  )
}

export function normalizeCustomerListInput(
  page: number,
  perPage: number,
  search?: string
): NormalizedCustomerListInput {
  return {
    page: clampInteger(page, 1, Number.MAX_SAFE_INTEGER),
    perPage: clampInteger(perPage, MIN_LIST_PER_PAGE, MAX_LIST_PER_PAGE),
    search: search?.trim() ? search.trim() : undefined,
  }
}

export function normalizeCustomerMutationInput(
  input: CreateCustomerInput
): NormalizedCustomerInput {
  return normalizeCustomerInput(input)
}
