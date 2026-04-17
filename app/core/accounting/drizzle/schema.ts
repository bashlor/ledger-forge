import { sql } from 'drizzle-orm'
import { check, date, integer, pgSchema, text, timestamp, unique } from 'drizzle-orm/pg-core'

export const mainSchema = pgSchema('main')

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

export const customers = mainSchema.table('customers', {
  address: text('address').notNull().default(''),
  company: text('company').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  email: text('email').notNull(),
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  note: text('note'),
  phone: text('phone').notNull(),
})

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

export const invoices = mainSchema.table(
  'invoices',
  {
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    // Canonical invoice snapshot model:
    // - customerCompanyName: current company display name while invoice is draft/listed
    // - customerCompanySnapshot/customerCompanyAddressSnapshot: frozen customer snapshot fields
    // - issuedCompanyName/issuedCompanyAddress: explicit company identity entered at issue time
    customerCompanyAddressSnapshot: text('customer_company_address_snapshot').notNull().default(''),
    customerCompanyName: text('customer_company_name').notNull(),
    customerCompanySnapshot: text('customer_company_snapshot').notNull(),
    customerEmailSnapshot: text('customer_email_snapshot').notNull(),
    customerId: text('customer_id')
      .notNull()
      .references(() => customers.id),
    customerPhoneSnapshot: text('customer_phone_snapshot').notNull(),
    customerPrimaryContactSnapshot: text('customer_primary_contact_snapshot').notNull(),
    dueDate: date('due_date', { mode: 'string' }).notNull(),
    id: text('id').primaryKey(),
    invoiceNumber: text('invoice_number').notNull().unique(),
    issueDate: date('issue_date', { mode: 'string' }).notNull(),
    issuedCompanyAddress: text('issued_company_address').notNull().default(''),
    issuedCompanyName: text('issued_company_name').notNull().default(''),
    status: text('status', { enum: ['draft', 'issued', 'paid'] })
      .notNull()
      .default('draft'),
    subtotalExclTaxCents: integer('subtotal_excl_tax_cents').notNull().default(0),
    totalInclTaxCents: integer('total_incl_tax_cents').notNull().default(0),
    totalVatCents: integer('total_vat_cents').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [check('invoices_status_check', sql`${table.status} IN ('draft', 'issued', 'paid')`)]
)

// ---------------------------------------------------------------------------
// Invoice lines
// ---------------------------------------------------------------------------

export const invoiceLines = mainSchema.table(
  'invoice_lines',
  {
    description: text('description').notNull(),
    id: text('id').primaryKey(),
    invoiceId: text('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),
    lineNumber: integer('line_number').notNull(),
    lineTotalExclTaxCents: integer('line_total_excl_tax_cents').notNull(),
    lineTotalInclTaxCents: integer('line_total_incl_tax_cents').notNull(),
    lineTotalVatCents: integer('line_total_vat_cents').notNull(),
    quantityCents: integer('quantity_cents').notNull(),
    unitPriceCents: integer('unit_price_cents').notNull(),
    vatRateCents: integer('vat_rate_cents').notNull(),
  },
  (table) => [unique('invoice_lines_invoice_line_unique').on(table.invoiceId, table.lineNumber)]
)

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

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
    check(
      'expenses_category_check',
      sql`${table.category} IN ('Software', 'Infrastructure', 'Office', 'Travel', 'Services', 'Other')`
    ),
  ]
)

// ---------------------------------------------------------------------------
// Journal entries
// ---------------------------------------------------------------------------

export const journalEntries = mainSchema.table(
  'journal_entries',
  {
    amountCents: integer('amount_cents').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    date: date('date', { mode: 'string' }).notNull(),
    expenseId: text('expense_id').references(() => expenses.id),
    id: text('id').primaryKey(),
    invoiceId: text('invoice_id').references(() => invoices.id),
    label: text('label').notNull(),
    type: text('type', { enum: ['expense', 'invoice'] }).notNull(),
  },
  (table) => [
    check('journal_entries_amount_positive', sql`${table.amountCents} > 0`),
    check('journal_entries_type_check', sql`${table.type} IN ('expense', 'invoice')`),
    unique('journal_entries_expense_unique').on(table.expenseId),
    unique('journal_entries_invoice_unique').on(table.invoiceId),
    check(
      'journal_entries_source_xor',
      sql`(${table.expenseId} IS NOT NULL)::int + (${table.invoiceId} IS NOT NULL)::int = 1`
    ),
  ]
)
