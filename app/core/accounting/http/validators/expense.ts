import { EXPENSE_CATEGORIES, type ExpenseCategory } from '#core/accounting/expense_categories'
import vine from '@vinejs/vine'

import {
  dateRangeRule,
  hasFieldValue,
  vineDateString,
  type VineFieldContextLike,
} from './shared.js'

export { EXPENSE_CATEGORIES, type ExpenseCategory }

export const createExpenseValidator = vine.create({
  amount: vine.number().positive().max(999_999_999_999.99),
  category: vine.enum(EXPENSE_CATEGORIES),
  date: vineDateString.clone(),
  label: vine.string().trim().minLength(1).maxLength(255),
})

export const expenseIndexValidator = vine.create(
  vine
    .object({
      endDate: vineDateString
        .clone()
        .optional()
        .requiredWhen((field: VineFieldContextLike) => hasFieldValue(field, 'startDate')),
      page: vine.number().min(1).optional(),
      perPage: vine.number().min(1).max(100).optional(),
      search: vine.string().trim().maxLength(255).optional(),
      startDate: vineDateString
        .clone()
        .optional()
        .requiredWhen((field: VineFieldContextLike) => hasFieldValue(field, 'endDate')),
    })
    .use(dateRangeRule())
)

export const expenseParamsValidator = vine.create({
  params: vine.object({
    id: vine.string().uuid(),
  }),
})
