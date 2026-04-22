import type { AccountingAccessContext } from '#core/accounting/application/support/access_context'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { CustomerService } from '#core/accounting/application/customers/index'
import { ExpenseService } from '#core/accounting/application/expenses/index'
import { InvoiceService } from '#core/accounting/application/invoices/index'
import { EXPENSE_CATEGORIES, type ExpenseCategory } from '#core/accounting/expense_categories'
import * as schema from '#core/common/drizzle/index'
import { count, eq, sql } from 'drizzle-orm'

interface DemoCustomerSeed {
  address: string
  company: string
  email: string
  name: string
  note?: string
  phone: string
}

interface DemoExpenseSeed {
  amount: number
  category: ExpenseCategory
  confirmed: boolean
  dateOffsetDays: number
  label: string
}

interface DemoInvoiceSeed {
  customerIndex: number
  dueOffsetDays: number
  issueOffsetDays: number
  lines: Array<{
    description: string
    quantity: number
    unitPrice: number
    vatRate: number
  }>
  status: 'draft' | 'issued' | 'paid'
}

export const DEMO_CUSTOMER_COUNT = 30
export const DEMO_EXPENSE_COUNT = 40
export const DEMO_INVOICE_COUNT = 50
export const DEMO_DRAFT_INVOICE_COUNT = 15
export const DEMO_ISSUED_INVOICE_COUNT = 20
export const DEMO_PAID_INVOICE_COUNT = 15
export const DEMO_CONFIRMED_EXPENSE_COUNT = 25

const ISSUED_COMPANY_ADDRESS = '15 rue de la Paix, 75001 Paris'
const ISSUED_COMPANY_NAME = 'Demo Accounting SAS'

export class DemoDatasetService {
  constructor(private readonly db: PostgresJsDatabase<typeof schema>) {}

  async clearTenantData(tenantId: string): Promise<void> {
    await this.runLockedTransaction(tenantId, async (tx) => {
      await this.clearTenantDataInTx(tx, tenantId)
    })
  }

  async hasAnyTenantData(tenantId: string): Promise<boolean> {
    const [row] = await this.db
      .select({
        value: sql<number>`
          (
            select count(*)::int from ${schema.customers} where ${schema.customers.organizationId} = ${tenantId}
          ) +
          (
            select count(*)::int from ${schema.invoices} where ${schema.invoices.organizationId} = ${tenantId}
          ) +
          (
            select count(*)::int from ${schema.expenses} where ${schema.expenses.organizationId} = ${tenantId}
          )
        `.mapWith(Number),
      })
      .from(schema.organization)
      .where(eq(schema.organization.id, tenantId))
      .limit(1)

    return Number(row?.value ?? 0) > 0
  }

  async resetTenant(access: AccountingAccessContext): Promise<void> {
    await this.runLockedTransaction(access.tenantId, async (tx) => {
      await this.clearTenantDataInTx(tx, access.tenantId)
      await this.seedTenantInTx(tx, access)
    })
  }

  async seedTenant(access: AccountingAccessContext): Promise<void> {
    await this.runLockedTransaction(access.tenantId, async (tx) => {
      await this.seedTenantInTx(tx, access)
    })
  }

  async seedTenantIfEmpty(access: AccountingAccessContext): Promise<boolean> {
    return this.runLockedTransaction(access.tenantId, async (tx) => {
      const [{ existingCustomers }] = await tx
        .select({ existingCustomers: count() })
        .from(schema.customers)
        .where(eq(schema.customers.organizationId, access.tenantId))

      const [{ existingInvoices }] = await tx
        .select({ existingInvoices: count() })
        .from(schema.invoices)
        .where(eq(schema.invoices.organizationId, access.tenantId))

      const [{ existingExpenses }] = await tx
        .select({ existingExpenses: count() })
        .from(schema.expenses)
        .where(eq(schema.expenses.organizationId, access.tenantId))

      if (
        Number(existingCustomers?.valueOf?.() ?? existingCustomers ?? 0) > 0 ||
        Number(existingInvoices?.valueOf?.() ?? existingInvoices ?? 0) > 0 ||
        Number(existingExpenses?.valueOf?.() ?? existingExpenses ?? 0) > 0
      ) {
        return false
      }

      await this.seedTenantInTx(tx, access)

      return true
    })
  }

  async seedTenantInTransaction(
    tx: PostgresJsDatabase<typeof schema>,
    access: AccountingAccessContext
  ): Promise<void> {
    await this.seedTenantInTx(tx, access)
  }

  private async clearTenantDataInTx(
    tx: PostgresJsDatabase<typeof schema>,
    tenantId: string
  ): Promise<void> {
    await tx.delete(schema.auditEvents).where(eq(schema.auditEvents.organizationId, tenantId))
    await tx.delete(schema.journalEntries).where(eq(schema.journalEntries.organizationId, tenantId))
    await tx.delete(schema.invoices).where(eq(schema.invoices.organizationId, tenantId))
    await tx.delete(schema.expenses).where(eq(schema.expenses.organizationId, tenantId))
    await tx.delete(schema.customers).where(eq(schema.customers.organizationId, tenantId))
  }

  private async runLockedTransaction<T>(
    tenantId: string,
    work: (tx: PostgresJsDatabase<typeof schema>) => Promise<T>
  ): Promise<T> {
    return this.db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`demo-seed:${tenantId}`}))`)
      return work(tx)
    })
  }

  private async seedTenantInTx(
    tx: PostgresJsDatabase<typeof schema>,
    access: AccountingAccessContext
  ): Promise<void> {
    const customerService = new CustomerService(tx)
    const invoiceService = new InvoiceService(tx)
    const expenseService = new ExpenseService(tx)
    const today = dateOnlyUtc(new Date())
    const customerSeeds = buildDemoCustomers()
    const invoiceSeeds = buildDemoInvoices()
    const expenseSeeds = buildDemoExpenses()

    const customers = []
    for (const seed of customerSeeds) {
      customers.push(await customerService.createCustomer(seed, access))
    }

    for (const seed of invoiceSeeds) {
      const created = await invoiceService.createDraft(
        {
          customerId: customers[seed.customerIndex]!.id,
          dueDate: addDays(today, seed.dueOffsetDays),
          issueDate: addDays(today, seed.issueOffsetDays),
          lines: seed.lines,
        },
        access
      )

      if (seed.status === 'issued' || seed.status === 'paid') {
        await invoiceService.issueInvoice(
          created.id,
          {
            issuedCompanyAddress: ISSUED_COMPANY_ADDRESS,
            issuedCompanyName: buildIssuedCompanyName(today),
          },
          access
        )
      }

      if (seed.status === 'paid') {
        await invoiceService.markInvoicePaid(created.id, access)
      }
    }

    for (const seed of expenseSeeds) {
      const created = await expenseService.createExpense(
        {
          amount: seed.amount,
          category: seed.category,
          date: addDays(today, seed.dateOffsetDays),
          label: seed.label,
        },
        access
      )

      if (seed.confirmed) {
        await expenseService.confirmExpense(created.id, access)
      }
    }
  }
}

function addDays(isoDate: string, days: number): string {
  const value = new Date(`${isoDate}T00:00:00.000Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return dateOnlyUtc(value)
}

function buildCity(id: number): string {
  const cities = [
    'Paris',
    'Lyon',
    'Bordeaux',
    'Lille',
    'Nantes',
    'Toulouse',
    'Rennes',
    'Montpellier',
    'Strasbourg',
    'Nice',
  ] as const

  return cities[(id - 1) % cities.length]!
}

function buildCompanyPrefix(id: number): string {
  const values = [
    'Northwind',
    'Atelier',
    'Kestrel',
    'Summit',
    'Harbor',
    'Lumen',
    'Vertex',
    'Bluebird',
    'Oakline',
    'Cobalt',
  ] as const

  return values[(id - 1) % values.length]!
}

function buildCompanySuffix(id: number): string {
  const values = [
    'Studio',
    'Analytics',
    'Partners',
    'Labs',
    'Consulting',
    'Works',
    'Collective',
    'Advisory',
    'Systems',
    'Services',
  ] as const

  return values[(id - 1) % values.length]!
}

function buildContactName(id: number): string {
  const firstNames = [
    'Sarah',
    'Marc',
    'Nina',
    'Louis',
    'Emma',
    'Hugo',
    'Chloe',
    'Leo',
    'Mila',
    'Noah',
  ] as const
  const lastNames = [
    'Chen',
    'Dubois',
    'Rossi',
    'Martin',
    'Garcia',
    'Bernard',
    'Petit',
    'Lambert',
    'Moreau',
    'Fontaine',
  ] as const

  return `${firstNames[(id - 1) % firstNames.length]!} ${lastNames[Math.floor((id - 1) / 2) % lastNames.length]!}`
}

function buildDemoCustomers(): DemoCustomerSeed[] {
  return Array.from({ length: DEMO_CUSTOMER_COUNT }, (_, index) => {
    const id = index + 1
    const companyToken = String(id).padStart(2, '0')

    return {
      address: `${10 + id} boulevard du Ledger, ${buildPostalCode(id)} ${buildCity(id)}`,
      company: `${buildCompanyPrefix(id)} ${buildCompanySuffix(id)} ${companyToken}`,
      email: `contact-${companyToken}@demo-accounting.test`,
      name: buildContactName(id),
      note: id % 3 === 0 ? `Account review planned for Q${(id % 4) + 1}.` : undefined,
      phone: `+33 6 ${String(10 + id).padStart(2, '0')} ${String(20 + id).padStart(2, '0')} ${String(30 + id).padStart(2, '0')} ${String(40 + id).padStart(2, '0')}`,
    }
  })
}

function buildDemoExpenses(): DemoExpenseSeed[] {
  return Array.from({ length: DEMO_EXPENSE_COUNT }, (_, index) => {
    const expenseNumber = index + 1

    return {
      amount: 24 + expenseNumber * 11,
      category: EXPENSE_CATEGORIES[index % EXPENSE_CATEGORIES.length]!,
      confirmed: index < DEMO_CONFIRMED_EXPENSE_COUNT,
      dateOffsetDays: -1 * (expenseNumber % 45),
      label: buildExpenseLabel(expenseNumber),
    }
  })
}

function buildDemoInvoices(): DemoInvoiceSeed[] {
  return Array.from({ length: DEMO_INVOICE_COUNT }, (_, index) => {
    const invoiceNumber = index + 1
    const status =
      index < DEMO_DRAFT_INVOICE_COUNT
        ? 'draft'
        : index < DEMO_DRAFT_INVOICE_COUNT + DEMO_ISSUED_INVOICE_COUNT
          ? 'issued'
          : 'paid'
    const issueOffsetDays = status === 'draft' ? index % 6 : -1 * ((invoiceNumber % 18) + 1)
    const dueOffsetDays =
      status === 'draft'
        ? issueOffsetDays + 10 + (invoiceNumber % 9)
        : Math.max(0, 3 + (invoiceNumber % 24))

    return {
      customerIndex: index % DEMO_CUSTOMER_COUNT,
      dueOffsetDays,
      issueOffsetDays,
      lines: [
        {
          description: buildInvoiceServiceLabel(invoiceNumber),
          quantity: 1 + (index % 3),
          unitPrice: 320 + (index % 7) * 85,
          vatRate: 20,
        },
        {
          description: buildInvoiceSupportLabel(invoiceNumber),
          quantity: 1 + (index % 2),
          unitPrice: 90 + (index % 5) * 30,
          vatRate: 20,
        },
      ],
      status,
    }
  })
}

function buildExpenseLabel(expenseNumber: number): string {
  const labels = [
    'Cloud hosting',
    'Coworking pass',
    'Train ticket',
    'Design support',
    'Accounting software',
    'Office supplies',
    'Domain renewal',
    'Client lunch',
  ] as const

  return `${labels[(expenseNumber - 1) % labels.length]!} ${String(expenseNumber).padStart(2, '0')}`
}

function buildInvoiceServiceLabel(invoiceNumber: number): string {
  const labels = [
    'Monthly bookkeeping',
    'Quarter-end close',
    'Revenue recognition review',
    'Management dashboard',
    'VAT advisory',
    'Cash-flow forecast',
    'Payroll reconciliation',
    'Board reporting pack',
  ] as const

  return `${labels[(invoiceNumber - 1) % labels.length]!} ${String(invoiceNumber).padStart(2, '0')}`
}

function buildInvoiceSupportLabel(invoiceNumber: number): string {
  const labels = [
    'Email support',
    'Review meeting',
    'Controller support',
    'Data cleanup',
    'Process workshop',
  ] as const

  return `${labels[(invoiceNumber - 1) % labels.length]!} ${((invoiceNumber - 1) % 4) + 1}`
}

function buildIssuedCompanyName(today: string): string {
  return `${ISSUED_COMPANY_NAME} ${today.slice(0, 4)}`
}

function buildPostalCode(id: number): string {
  const postalCodes = [
    '75011',
    '69002',
    '33000',
    '59800',
    '44000',
    '31000',
    '35000',
    '34000',
    '67000',
    '06000',
  ] as const

  return postalCodes[(id - 1) % postalCodes.length]!
}

function dateOnlyUtc(value: Date): string {
  return value.toISOString().slice(0, 10)
}
