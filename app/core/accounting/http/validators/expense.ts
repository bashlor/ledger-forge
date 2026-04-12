import vine from '@vinejs/vine'

const EXPENSE_CATEGORIES = [
  'Software',
  'Infrastructure',
  'Office',
  'Travel',
  'Services',
  'Other',
] as const

const dateValidatorRegex = vine.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const createExpenseValidator = vine.create({
  amount: vine.number().positive().max(999_999_999_999.99),
  category: vine.enum(EXPENSE_CATEGORIES),
  date: dateValidatorRegex.clone(),
  label: vine.string().trim().minLength(1).maxLength(255),
})

export const expenseIndexValidator = vine.create({
  endDate: dateValidatorRegex.clone().optional(),
  page: vine.number().min(1).optional(),
  startDate: dateValidatorRegex.clone().optional(),
})

export const expenseParamsValidator = vine.create({
  params: vine.object({
    id: vine.string().uuid(),
  }),
})
