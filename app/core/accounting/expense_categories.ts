/**
 * Canonical list of allowed expense categories.
 *
 * This is the single source of truth — imported by both the service layer
 * (business-rule guard) and the schema layer (DB CHECK constraint), avoiding
 * duplication and keeping them in sync automatically.
 */
export const EXPENSE_CATEGORIES = [
  'Software',
  'Infrastructure',
  'Office',
  'Travel',
  'Services',
  'Other',
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]
