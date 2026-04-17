import vine from '@vinejs/vine'

import { vineDateString } from './shared.js'

const EXPENSE_CATEGORIES = [
  'Software',
  'Infrastructure',
  'Office',
  'Travel',
  'Services',
  'Other',
] as const

export const createExpenseValidator = vine.create({
  amount: vine.number().positive().max(999_999_999_999.99),
  category: vine.enum(EXPENSE_CATEGORIES),
  date: vineDateString.clone(),
  label: vine.string().trim().minLength(1).maxLength(255),
})

export const expenseIndexValidator = vine.create({
  endDate: vineDateString.clone().optional(),
  page: vine.number().min(1).optional(),
  startDate: vineDateString.clone().optional(),
})

export const expenseParamsValidator = vine.create({
  params: vine.object({
    id: vine.string().uuid(),
  }),
})
