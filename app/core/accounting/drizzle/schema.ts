import { sql } from 'drizzle-orm'
import { check, date, integer, pgSchema, text, timestamp } from 'drizzle-orm/pg-core'

export const mainSchema = pgSchema('main')

export const expenses = mainSchema.table(
  'expenses',
  {
    amountCents: integer('amount_cents').notNull(),
    category: text('category').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    date: date('date', { mode: 'string' }).notNull(),
    id: text('id').primaryKey(),
    label: text('label').notNull(),
    status: text('status', { enum: ['draft', 'confirmed'] })
      .notNull()
      .default('draft'),
  },
  (table) => [
    check('expenses_status_check', sql`${table.status} IN ('draft', 'confirmed')`),
    check('expenses_amount_positive', sql`${table.amountCents} > 0`),
  ]
)

export const journalEntries = mainSchema.table(
  'journal_entries',
  {
    amountCents: integer('amount_cents').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    date: date('date', { mode: 'string' }).notNull(),
    expenseId: text('expense_id')
      .notNull()
      .references(() => expenses.id),
    id: text('id').primaryKey(),
    label: text('label').notNull(),
    type: text('type', { enum: ['expense'] })
      .notNull()
      .default('expense'),
  },
  (table) => [
    check('journal_entries_amount_positive', sql`${table.amountCents} > 0`),
    check('journal_entries_type_check', sql`${table.type} IN ('expense')`),
  ]
)
