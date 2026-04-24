import type { AccountingAccessContext } from '#core/accounting/application/support/access_context'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { listAuditEventsForEntity } from '#core/accounting/application/audit/audit_queries'
import { CustomerService } from '#core/accounting/application/customers/index'
import { DashboardService } from '#core/accounting/application/dashboard/index'
import { ExpenseService } from '#core/accounting/application/expenses/index'
import { InvoiceService } from '#core/accounting/application/invoices/index'
import {
  auditEvents,
  customers,
  expenses,
  invoiceLines,
  invoices,
  journalEntries,
} from '#core/accounting/drizzle/schema'
import { organization } from '#core/user_management/drizzle/schema'
import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'

import { setupTestDatabaseForGroup } from '../../../../../tests/helpers/testcontainers_db.js'

// ---------------------------------------------------------------------------
// Two isolated tenants — no data should leak between them
// ---------------------------------------------------------------------------

const TENANT_A_ID = 'tenant-isolation-a'
const TENANT_B_ID = 'tenant-isolation-b'

const accessA: AccountingAccessContext = {
  actorId: 'actor-a',
  isAnonymous: false,
  requestId: 'isolation-test',
  tenantId: TENANT_A_ID,
}

const accessB: AccountingAccessContext = {
  actorId: 'actor-b',
  isAnonymous: false,
  requestId: 'isolation-test',
  tenantId: TENANT_B_ID,
}

// ---------------------------------------------------------------------------
// Test group
// ---------------------------------------------------------------------------

test.group('Cross-tenant isolation', (group) => {
  let cleanup: () => Promise<void>
  let db: PostgresJsDatabase<any>

  group.setup(async () => {
    const ctx = await setupTestDatabaseForGroup()
    cleanup = ctx.cleanup
    db = await app.container.make('drizzle')

    // Seed both organizations
    await db.insert(organization).values([
      { id: TENANT_A_ID, name: 'Tenant A', slug: 'tenant-a' },
      { id: TENANT_B_ID, name: 'Tenant B', slug: 'tenant-b' },
    ])
  })

  group.each.setup(async () => {
    await db.delete(auditEvents)
    await db.delete(journalEntries)
    await db.delete(invoiceLines)
    await db.delete(invoices)
    await db.delete(customers)
    await db.delete(expenses)
  })

  group.teardown(async () => cleanup())

  // -------------------------------------------------------------------------
  // CustomerService isolation
  // -------------------------------------------------------------------------

  test('tenant B cannot list customers created by tenant A', async ({ assert }) => {
    const customerService = new CustomerService(db)
    await customerService.createCustomer(
      { address: '1 rue A', company: 'Company A', email: 'a@a.com', name: 'Alice', phone: '111' },
      accessA
    )

    const resultB = await customerService.listCustomersPage(1, 10, accessB)
    assert.equal(resultB.items.length, 0)
    assert.equal(resultB.pagination.totalItems, 0)
  })

  test('tenant B cannot find a customer belonging to tenant A by id', async ({ assert }) => {
    const customerService = new CustomerService(db)
    const created = await customerService.createCustomer(
      { address: '1 rue A', company: 'Company A', email: 'a@a.com', name: 'Alice', phone: '111' },
      accessA
    )

    await assert.rejects(
      () =>
        customerService.updateCustomer(
          created.id,
          { address: '', company: 'Hacked', email: 'x@x.com', name: 'X', phone: '' },
          accessB
        ),
      'Customer not found.'
    )
  })

  test('tenant B cannot delete a customer belonging to tenant A', async ({ assert }) => {
    const customerService = new CustomerService(db)
    const created = await customerService.createCustomer(
      { address: '1 rue A', company: 'Company A', email: 'a@a.com', name: 'Alice', phone: '111' },
      accessA
    )

    await assert.rejects(
      () => customerService.deleteCustomer(created.id, accessB),
      'Customer not found.'
    )

    // Verify customer still exists for tenant A
    const resultA = await customerService.listCustomersPage(1, 10, accessA)
    assert.equal(resultA.items.length, 1)
  })

  // -------------------------------------------------------------------------
  // InvoiceService isolation
  // -------------------------------------------------------------------------

  test('tenant B cannot list invoices created by tenant A', async ({ assert }) => {
    const customerService = new CustomerService(db)
    const invoiceService = new InvoiceService(db)

    const customer = await customerService.createCustomer(
      {
        address: '1 rue A',
        company: 'Invoice Co',
        email: 'inv@a.com',
        name: 'Alice',
        phone: '111',
      },
      accessA
    )

    await invoiceService.createDraft(
      {
        customerId: customer.id,
        dueDate: '2099-05-01',
        issueDate: '2099-04-01',
        lines: [{ description: 'Service', quantity: 1, unitPrice: 100, vatRate: 20 }],
      },
      accessA
    )

    const resultB = await invoiceService.listInvoices(1, 10, accessB)
    assert.equal(resultB.items.length, 0)
    assert.equal(resultB.pagination.totalItems, 0)
  })

  test('tenant B cannot read an invoice belonging to tenant A', async ({ assert }) => {
    const customerService = new CustomerService(db)
    const invoiceService = new InvoiceService(db)

    const customer = await customerService.createCustomer(
      { address: '1 rue A', company: 'Read Co', email: 'read@a.com', name: 'Alice', phone: '111' },
      accessA
    )

    const draft = await invoiceService.createDraft(
      {
        customerId: customer.id,
        dueDate: '2099-05-01',
        issueDate: '2099-04-01',
        lines: [{ description: 'Service', quantity: 1, unitPrice: 100, vatRate: 20 }],
      },
      accessA
    )

    const resultB = await invoiceService.getInvoiceById(draft.id, accessB)
    assert.isNull(resultB)
  })

  test('tenant B cannot cancel a draft invoice belonging to tenant A', async ({ assert }) => {
    const customerService = new CustomerService(db)
    const invoiceService = new InvoiceService(db)

    const customer = await customerService.createCustomer(
      {
        address: '1 rue A',
        company: 'Cancel Co',
        email: 'cancel@a.com',
        name: 'Alice',
        phone: '111',
      },
      accessA
    )

    const draft = await invoiceService.createDraft(
      {
        customerId: customer.id,
        dueDate: '2099-05-01',
        issueDate: '2099-04-01',
        lines: [{ description: 'Service', quantity: 1, unitPrice: 100, vatRate: 20 }],
      },
      accessA
    )

    await assert.rejects(() => invoiceService.deleteDraft(draft.id, accessB), 'Invoice not found.')

    // Verify invoice still exists for tenant A
    const resultA = await invoiceService.listInvoices(1, 10, accessA)
    assert.equal(resultA.items.length, 1)
  })

  // -------------------------------------------------------------------------
  // ExpenseService isolation
  // -------------------------------------------------------------------------

  test('tenant B cannot list expenses created by tenant A', async ({ assert }) => {
    const expenseService = new ExpenseService(db)
    await expenseService.createExpense(
      { amount: 50, category: 'Software', date: '2026-04-01', label: 'License A' },
      accessA
    )

    const resultB = await expenseService.listExpenses(1, 10, accessB)
    assert.equal(resultB.items.length, 0)
    assert.equal(resultB.pagination.totalItems, 0)
  })

  test('tenant B cannot confirm an expense belonging to tenant A', async ({ assert }) => {
    const expenseService = new ExpenseService(db)
    const created = await expenseService.createExpense(
      { amount: 50, category: 'Software', date: '2026-04-01', label: 'License A' },
      accessA
    )

    await assert.rejects(
      () => expenseService.confirmExpense(created.id, accessB),
      'Expense not found.'
    )
  })

  test('tenant B cannot delete an expense belonging to tenant A', async ({ assert }) => {
    const expenseService = new ExpenseService(db)
    const created = await expenseService.createExpense(
      { amount: 50, category: 'Software', date: '2026-04-01', label: 'License A' },
      accessA
    )

    await assert.rejects(
      () => expenseService.deleteExpense(created.id, accessB),
      'Expense not found.'
    )
  })

  // -------------------------------------------------------------------------
  // DashboardService isolation
  // -------------------------------------------------------------------------

  test('dashboard aggregates are scoped to the active tenant', async ({ assert }) => {
    const customerService = new CustomerService(db)
    const invoiceService = new InvoiceService(db)
    const expenseService = new ExpenseService(db)
    const dashboardService = new DashboardService(db)

    // Create data for tenant A
    const customer = await customerService.createCustomer(
      {
        address: '1 rue A',
        company: 'Dashboard Co',
        email: 'dash@a.com',
        name: 'Alice',
        phone: '111',
      },
      accessA
    )

    const draft = await invoiceService.createDraft(
      {
        customerId: customer.id,
        dueDate: '2099-05-01',
        issueDate: '2099-04-01',
        lines: [{ description: 'Service', quantity: 1, unitPrice: 500, vatRate: 20 }],
      },
      accessA
    )

    await invoiceService.issueInvoice(
      draft.id,
      { issuedCompanyAddress: '1 rue X', issuedCompanyName: 'My Company' },
      accessA
    )

    await expenseService.createExpense(
      { amount: 100, category: 'Software', date: '2026-04-01', label: 'Tool A' },
      accessA
    )
    const expenseA = await expenseService.createExpense(
      { amount: 200, category: 'Software', date: '2026-04-02', label: 'Tool B' },
      accessA
    )
    await expenseService.confirmExpense(expenseA.id, accessA)

    // Tenant B dashboard should be empty
    const dashB = await dashboardService.getDashboard(accessB)
    assert.equal(dashB.summary.totalRevenue, 0)
    assert.equal(dashB.summary.totalCollected, 0)
    assert.equal(dashB.summary.totalExpenses, 0)
    assert.equal(dashB.summary.profit, 0)
    assert.equal(dashB.recentInvoices.length, 0)

    // Tenant A dashboard should have data
    const dashA = await dashboardService.getDashboard(accessA)
    assert.isAbove(dashA.summary.totalRevenue, 0)
    assert.equal(dashA.recentInvoices.length, 1)
  })

  // -------------------------------------------------------------------------
  // Invoice number sequence isolation
  // -------------------------------------------------------------------------

  test('invoice numbers are independent per tenant', async ({ assert }) => {
    const customerService = new CustomerService(db)
    const invoiceService = new InvoiceService(db)

    const customerA = await customerService.createCustomer(
      { address: '1 rue A', company: 'Seq Co A', email: 'seq@a.com', name: 'Alice', phone: '111' },
      accessA
    )
    const customerB = await customerService.createCustomer(
      { address: '2 rue B', company: 'Seq Co B', email: 'seq@b.com', name: 'Bob', phone: '222' },
      accessB
    )

    const draftA = await invoiceService.createDraft(
      {
        customerId: customerA.id,
        dueDate: '2099-05-01',
        issueDate: '2099-04-01',
        lines: [{ description: 'Service A', quantity: 1, unitPrice: 100, vatRate: 20 }],
      },
      accessA
    )

    const draftB = await invoiceService.createDraft(
      {
        customerId: customerB.id,
        dueDate: '2099-05-01',
        issueDate: '2099-04-01',
        lines: [{ description: 'Service B', quantity: 1, unitPrice: 100, vatRate: 20 }],
      },
      accessB
    )

    // Both tenants should start at INV-2099-001
    assert.equal(draftA.invoiceNumber, 'INV-2099-001')
    assert.equal(draftB.invoiceNumber, 'INV-2099-001')
  })

  // -------------------------------------------------------------------------
  // Audit trail isolation
  // -------------------------------------------------------------------------

  test('tenant B cannot query audit events from another tenant', async ({ assert }) => {
    const customerIdB = 'audit-iso-cust-b'
    await db.insert(customers).values({
      address: 'B street',
      company: 'Co B',
      email: 'b@b.com',
      id: customerIdB,
      name: 'B',
      organizationId: TENANT_B_ID,
      phone: '+33 1 00 00 00 02',
    })

    const serviceB = new InvoiceService(db)
    const invoiceB = await serviceB.createDraft(
      {
        customerId: customerIdB,
        dueDate: '2099-05-01',
        issueDate: '2099-04-01',
        lines: [{ description: 'B work', quantity: 1, unitPrice: 50, vatRate: 20 }],
      },
      { ...accessA, tenantId: TENANT_B_ID }
    )

    const crossLeak = await listAuditEventsForEntity(db, {
      entityId: invoiceB.id,
      entityType: 'invoice',
      tenantId: TENANT_A_ID,
    })
    assert.lengthOf(crossLeak, 0)
  })
})
