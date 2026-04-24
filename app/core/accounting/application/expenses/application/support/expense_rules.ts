import {
  clampInteger,
  MAX_LIST_PER_PAGE,
  MIN_LIST_PER_PAGE,
} from '#core/accounting/application/support/pagination'
import { DomainError } from '#core/common/errors/domain_error'

import type { CreateExpenseInput, ExpenseRow, NormalizedExpenseInput } from '../../types.js'

import { normalizeExpenseInput } from '../../validation.js'

export interface NormalizedExpenseListInput {
  page: number
  perPage: number
  search?: string
}

export function buildConfirmExpenseError(state: ExpenseRow | undefined): DomainError {
  if (!state) {
    return new DomainError('Expense not found.', 'not_found')
  }

  return new DomainError('Only draft expenses can be confirmed.', 'business_logic_error')
}

export function buildDeleteExpenseError(state: ExpenseRow | undefined): DomainError {
  if (!state) {
    return new DomainError('Expense not found.', 'not_found')
  }

  return new DomainError('Only draft expenses can be deleted.', 'business_logic_error')
}

export function normalizeExpenseListInput(
  page: number,
  perPage: number,
  search?: string
): NormalizedExpenseListInput {
  return {
    page: clampInteger(page, 1, Number.MAX_SAFE_INTEGER),
    perPage: clampInteger(perPage, MIN_LIST_PER_PAGE, MAX_LIST_PER_PAGE),
    search: search?.trim() ? search.trim() : undefined,
  }
}

export function normalizeExpenseMutationInput(input: CreateExpenseInput): NormalizedExpenseInput {
  return normalizeExpenseInput(input)
}
