import type { CommandOptions } from '@adonisjs/core/types/ace'

import {
  customers,
  expenses,
  invoiceLines,
  invoices,
  journalEntries,
} from '#core/accounting/drizzle/schema'
import { CustomerService } from '#core/accounting/services/customer_service'
import { ExpenseService } from '#core/accounting/services/expense_service'
import { BaseCommand, flags } from '@adonisjs/core/ace'
import { count } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const DEMO_CUSTOMERS = [
  {
    address: '12 rue des Cerisiers, 75011 Paris',
    company: 'Northwind Studio',
    email: 'sarah@northwind.test',
    name: 'Sarah Chen',
    note: 'Recurring client',
    phone: '+33 6 11 22 33 44',
  },
  {
    address: '8 avenue Victor Hugo, 69002 Lyon',
    company: 'Atelier Horizon',
    email: 'marc@horizon.test',
    name: 'Marc Dubois',
    phone: '+33 6 55 66 77 88',
  },
  {
    address: '42 quai des Arts, 33000 Bordeaux',
    company: 'Kestrel Analytics',
    email: 'nina@kestrel.test',
    name: 'Nina Rossi',
    note: 'Client onboarding',
    phone: '+33 6 20 30 40 50',
  },
] as const

// INV-2026-001 — Northwind Studio, issued
// Line 1: Monthly bookkeeping qty=1 × 1600€ excl. VAT 20% → total 1920€
// Line 2: VAT advisory        qty=1 × 400€  excl. VAT 20% → total 480€
// Invoice: excl=2000€ vat=400€ incl=2400€
const INV_001_LINES = [
  {
    description: 'Monthly bookkeeping',
    lineNumber: 1,
    lineTotalExclTaxCents: 160000,
    lineTotalInclTaxCents: 192000,
    lineTotalVatCents: 32000,
    quantityCents: 100,
    unitPriceCents: 160000,
    vatRateCents: 2000,
  },
  {
    description: 'VAT advisory',
    lineNumber: 2,
    lineTotalExclTaxCents: 40000,
    lineTotalInclTaxCents: 48000,
    lineTotalVatCents: 8000,
    quantityCents: 100,
    unitPriceCents: 40000,
    vatRateCents: 2000,
  },
]

// INV-2026-002 — Atelier Horizon, paid
// Line 1: Quarter-end close  qty=1 × 1200€ excl. VAT 20% → total 1440€
// Line 2: Cash flow review   qty=2 × 150€  excl. VAT 20% → total 360€
// Invoice: excl=1500€ vat=300€ incl=1800€
const INV_002_LINES = [
  {
    description: 'Quarter-end close',
    lineNumber: 1,
    lineTotalExclTaxCents: 120000,
    lineTotalInclTaxCents: 144000,
    lineTotalVatCents: 24000,
    quantityCents: 100,
    unitPriceCents: 120000,
    vatRateCents: 2000,
  },
  {
    description: 'Cash flow review',
    lineNumber: 2,
    lineTotalExclTaxCents: 30000,
    lineTotalInclTaxCents: 36000,
    lineTotalVatCents: 6000,
    quantityCents: 200,
    unitPriceCents: 15000,
    vatRateCents: 2000,
  },
]

// INV-2026-003 — Kestrel Analytics, draft
// Line 1: Revenue recognition review  qty=1 × 850€  excl. VAT 20% → total 1020€
// Line 2: Reporting setup             qty=3 × 120€  excl. VAT 20% → total 432€
// Invoice: excl=1210€ vat=242€ incl=1452€
const INV_003_LINES = [
  {
    description: 'Revenue recognition review',
    lineNumber: 1,
    lineTotalExclTaxCents: 85000,
    lineTotalInclTaxCents: 102000,
    lineTotalVatCents: 17000,
    quantityCents: 100,
    unitPriceCents: 85000,
    vatRateCents: 2000,
  },
  {
    description: 'Reporting setup',
    lineNumber: 2,
    lineTotalExclTaxCents: 36000,
    lineTotalInclTaxCents: 43200,
    lineTotalVatCents: 7200,
    quantityCents: 300,
    unitPriceCents: 12000,
    vatRateCents: 2000,
  },
]

interface DemoInvoice {
  customerCompanyAddressSnapshot: string
  customerCompanyName: string
  customerCompanySnapshot: string
  customerEmailSnapshot: string
  customerKey: 'atelier' | 'kestrel' | 'northwind'
  customerPhoneSnapshot: string
  customerPrimaryContactSnapshot: string
  dueDate: string
  invoiceNumber: string
  issueDate: string
  issuedCompanyAddress: string
  issuedCompanyName: string
  lines: {
    description: string
    lineNumber: number
    lineTotalExclTaxCents: number
    lineTotalInclTaxCents: number
    lineTotalVatCents: number
    quantityCents: number
    unitPriceCents: number
    vatRateCents: number
  }[]
  status: 'draft' | 'issued' | 'paid'
  subtotalExclTaxCents: number
  totalInclTaxCents: number
  totalVatCents: number
}

const ISSUED_COMPANY_NAME = 'Demo Accounting SAS'
const ISSUED_COMPANY_ADDRESS = '15 rue de la Paix, 75001 Paris'

const DEMO_INVOICES: readonly DemoInvoice[] = [
  {
    customerCompanyAddressSnapshot: '12 rue des Cerisiers, 75011 Paris',
    customerCompanyName: 'Northwind Studio',
    customerCompanySnapshot: 'Northwind Studio',
    customerEmailSnapshot: 'sarah@northwind.test',
    customerKey: 'northwind',
    customerPhoneSnapshot: '+33 6 11 22 33 44',
    customerPrimaryContactSnapshot: 'Sarah Chen',
    dueDate: '2026-04-15',
    invoiceNumber: 'INV-2026-001',
    issueDate: '2026-04-01',
    issuedCompanyAddress: ISSUED_COMPANY_ADDRESS,
    issuedCompanyName: ISSUED_COMPANY_NAME,
    lines: INV_001_LINES,
    status: 'issued',
    subtotalExclTaxCents: 200000,
    totalInclTaxCents: 240000,
    totalVatCents: 40000,
  },
  {
    customerCompanyAddressSnapshot: '8 avenue Victor Hugo, 69002 Lyon',
    customerCompanyName: 'Atelier Horizon',
    customerCompanySnapshot: 'Atelier Horizon',
    customerEmailSnapshot: 'marc@horizon.test',
    customerKey: 'atelier',
    customerPhoneSnapshot: '+33 6 55 66 77 88',
    customerPrimaryContactSnapshot: 'Marc Dubois',
    dueDate: '2026-04-10',
    invoiceNumber: 'INV-2026-002',
    issueDate: '2026-03-20',
    issuedCompanyAddress: ISSUED_COMPANY_ADDRESS,
    issuedCompanyName: ISSUED_COMPANY_NAME,
    lines: INV_002_LINES,
    status: 'paid',
    subtotalExclTaxCents: 150000,
    totalInclTaxCents: 180000,
    totalVatCents: 30000,
  },
  {
    customerCompanyAddressSnapshot: '42 quai des Arts, 33000 Bordeaux',
    customerCompanyName: 'Kestrel Analytics',
    customerCompanySnapshot: 'Kestrel Analytics',
    customerEmailSnapshot: 'nina@kestrel.test',
    customerKey: 'kestrel',
    customerPhoneSnapshot: '+33 6 20 30 40 50',
    customerPrimaryContactSnapshot: 'Nina Rossi',
    dueDate: '2026-04-18',
    invoiceNumber: 'INV-2026-003',
    issueDate: '2026-04-03',
    issuedCompanyAddress: '',
    issuedCompanyName: '',
    lines: INV_003_LINES,
    status: 'draft',
    subtotalExclTaxCents: 121000,
    totalInclTaxCents: 145200,
    totalVatCents: 24200,
  },
]

interface ExpenseSeed {
  amount: number
  category: string
  confirmed: boolean
  date: string
  label: string
}

const DEMO_EXPENSES: readonly ExpenseSeed[] = [
  { amount: 18, category: 'Software', confirmed: true, date: '2026-04-02', label: 'Figma' },
  { amount: 220, category: 'Office', confirmed: false, date: '2026-04-01', label: 'Coworking' },
  {
    amount: 146,
    category: 'Infrastructure',
    confirmed: true,
    date: '2026-03-29',
    label: 'Amazon Web Services',
  },
  {
    amount: 85,
    category: 'Infrastructure',
    confirmed: true,
    date: '2026-03-15',
    label: 'Error monitoring plan',
  },
  {
    amount: 310,
    category: 'Services',
    confirmed: false,
    date: '2026-03-18',
    label: 'Contractor design support',
  },
  {
    amount: 235,
    category: 'Travel',
    confirmed: true,
    date: '2026-03-14',
    label: 'Client workshop train',
  },
  {
    amount: 29,
    category: 'Software',
    confirmed: true,
    date: '2026-03-02',
    label: 'Calendar scheduling',
  },
  {
    amount: 74,
    category: 'Office',
    confirmed: false,
    date: '2026-02-16',
    label: 'Coworking day passes',
  },
]

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export default class SeedDemo extends BaseCommand {
  static commandName = 'demo:seed'
  static description = 'Seed all demo data (customers, invoices, expenses)'

  static options: CommandOptions = { startApp: true }

  @flags.boolean({ description: 'Delete all existing data before seeding' })
  declare reset: boolean

  async run() {
    const db = await this.app.container.make('drizzle')

    if (this.reset) {
      // Delete in FK-safe order; invoices cascade-deletes invoice_lines
      await db.delete(journalEntries)
      await db.delete(invoices)
      await db.delete(expenses)
      await db.delete(customers)
      this.logger.info('Deleted all existing data.')
    } else {
      const [existing] = await db.select({ value: count() }).from(customers)
      if ((existing?.value ?? 0) > 0) {
        this.exitCode = 1
        this.logger.error('Data already exists. Re-run with --reset to replace it.')
        return
      }
    }

    // -----------------------------------------------------------------------
    // 1. Customers
    // -----------------------------------------------------------------------
    const customerService = await this.app.container.make(CustomerService)
    const createdCustomers: Record<string, string> = {} // key → id

    const keyMap = ['northwind', 'atelier', 'kestrel'] as const

    for (const [i, seed] of DEMO_CUSTOMERS.entries()) {
      const created = await customerService.createCustomer(seed)
      createdCustomers[keyMap[i]] = created.id
    }

    this.logger.info(`Seeded ${DEMO_CUSTOMERS.length} customers.`)

    // -----------------------------------------------------------------------
    // 2. Invoices (direct DB insert to bypass date validation)
    // -----------------------------------------------------------------------
    for (const inv of DEMO_INVOICES) {
      const invoiceId = uuidv7()
      const customerId = createdCustomers[inv.customerKey]

      await db.insert(invoices).values({
        customerCompanyAddressSnapshot: inv.customerCompanyAddressSnapshot,
        customerCompanyName: inv.customerCompanyName,
        customerCompanySnapshot: inv.customerCompanySnapshot,
        customerEmailSnapshot: inv.customerEmailSnapshot,
        customerId,
        customerPhoneSnapshot: inv.customerPhoneSnapshot,
        customerPrimaryContactSnapshot: inv.customerPrimaryContactSnapshot,
        dueDate: inv.dueDate,
        id: invoiceId,
        invoiceNumber: inv.invoiceNumber,
        issueDate: inv.issueDate,
        issuedCompanyAddress: inv.issuedCompanyAddress,
        issuedCompanyName: inv.issuedCompanyName,
        status: inv.status,
        subtotalExclTaxCents: inv.subtotalExclTaxCents,
        totalInclTaxCents: inv.totalInclTaxCents,
        totalVatCents: inv.totalVatCents,
      })

      await db.insert(invoiceLines).values(
        inv.lines.map((line) => ({
          ...line,
          id: uuidv7(),
          invoiceId,
        }))
      )

      // Journal entry for issued and paid invoices (mirrors what issueInvoice() does)
      if (inv.status === 'issued' || inv.status === 'paid') {
        await db.insert(journalEntries).values({
          amountCents: inv.totalInclTaxCents,
          date: inv.issueDate,
          id: uuidv7(),
          invoiceId,
          label: inv.invoiceNumber,
          type: 'invoice',
        })
      }
    }

    this.logger.info(`Seeded ${DEMO_INVOICES.length} invoices.`)

    // -----------------------------------------------------------------------
    // 3. Expenses (via service — handles journal entries for confirmed)
    // -----------------------------------------------------------------------
    const expenseService = await this.app.container.make(ExpenseService)
    let confirmedCount = 0

    for (const seed of DEMO_EXPENSES) {
      const created = await expenseService.createExpense({
        amount: seed.amount,
        category: seed.category,
        date: seed.date,
        label: seed.label,
      })
      if (seed.confirmed) {
        await expenseService.confirmExpense(created.id)
        confirmedCount++
      }
    }

    this.logger.info(
      `Seeded ${DEMO_EXPENSES.length} expenses (${confirmedCount} confirmed, ${DEMO_EXPENSES.length - confirmedCount} drafts).`
    )

    this.logger.success('Demo seed complete.')
  }
}
