import { EXPENSE_CATEGORIES, type ExpenseCategory } from '#core/accounting/expense_categories'
import { DomainError } from '#core/common/errors/domain_error'
import { isValidIsoDate } from '#core/shared/date'
import { toCents } from '#core/shared/money'

import type { CreateExpenseInput, NormalizedExpenseInput } from './types.js'

export function normalizeExpenseInput(input: CreateExpenseInput): NormalizedExpenseInput {
  if (input.amount <= 0) {
    throw new DomainError('Amount must be greater than 0.', 'invalid_data')
  }

  if (!isValidIsoDate(input.date)) {
    throw new DomainError('Expense date must be a valid calendar date.', 'invalid_data')
  }

  const label = input.label.trim()
  if (!label) {
    throw new DomainError('Label must not be empty.', 'invalid_data')
  }

  if (!EXPENSE_CATEGORIES.includes(input.category as ExpenseCategory)) {
    throw new DomainError('Invalid expense category.', 'invalid_data')
  }

  return {
    amountCents: toCents(input.amount),
    category: input.category as ExpenseCategory,
    date: input.date,
    label,
  }
}
