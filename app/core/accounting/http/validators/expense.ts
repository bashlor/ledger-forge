import { EXPENSE_CATEGORIES, type ExpenseCategory } from '#core/accounting/services/expense_service'
import vine from '@vinejs/vine'

import { vineDateString } from './shared.js'

export { EXPENSE_CATEGORIES, type ExpenseCategory }

export const createExpenseValidator = vine.create({
  amount: vine.number().positive().max(999_999_999_999.99),
  category: vine.enum(EXPENSE_CATEGORIES),
  date: vineDateString.clone(),
  label: vine.string().trim().minLength(1).maxLength(255),
})

export const expenseIndexValidator = vine.create({
  endDate: vineDateString
    .clone()
    .optional()
    .requiredWhen((field) => !!field.data.startDate),
  page: vine.number().min(1).optional(),
  startDate: vineDateString
    .clone()
    .optional()
    .requiredWhen((field) => !!field.data.endDate),
})

export const expenseParamsValidator = vine.create({
  params: vine.object({
    id: vine.string().uuid(),
  }),
})
