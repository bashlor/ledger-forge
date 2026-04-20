import type { AccountingAccessContext } from '#core/accounting/application/support/access_context'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { listAuditEventsForEntity } from '#core/accounting/application/audit/audit_queries'
import { CustomerService } from '#core/accounting/application/customers/index'
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
import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'

import {
  seedTestOrganization,
  setupTestDatabaseForGroup,
  TEST_TENANT_ID,
} from '../../../../../tests/helpers/testcontainers_db.js'

const TEST_CUSTOMER_ID = 'audit-trail-test-customer'

const ACCESS: AccountingAccessContext = {
  actorId: 'audit-test-actor',
  isAnonymous: false,
  requestId: 'audit-test',
  tenantId: TEST_TENANT_ID,
}

test.group('Audit trail | invoice lifecycle', (group) => {
  let cleanup: () => Promise<void>
  let db: PostgresJsDatabase<any>

  group.setup(async () => {
    const ctx = await setupTestDatabaseForGroup()
    cleanup = ctx.cleanup
    db = await app.container.make('drizzle')
    await seedTestOrganization(db)
  })

  group.each.setup(async () => {
    await db.delete(auditEvents)
    await db.delete(journalEntries)
    await db.delete(invoiceLines)
    await db.delete(invoices)
    await db.delete(customers)

    await db.insert(customers).values({
      address: '1 rue Audit, 75001 Paris',
      company: 'Audit Test Co',
      email: 'audit@test.com',
      id: TEST_CUSTOMER_ID,
      name: 'Audit Tester',
      organizationId: TEST_TENANT_ID,
      phone: '+33 1 00 00 00 00',
    })
  })

  group.teardown(async () => cleanup())

  const draftInput = {
    customerId: TEST_CUSTOMER_ID,
    dueDate: '2099-05-01',
    issueDate: '2099-04-01',
    lines: [{ description: 'Consulting', quantity: 1, unitPrice: 100, vatRate: 20 }],
  }

  test('create_draft records an audit event', async ({ assert }) => {
    const service = new InvoiceService(db)
    const invoice = await service.createDraft(draftInput, ACCESS)

    const events = await listAuditEventsForEntity(db, {
      entityId: invoice.id,
      entityType: 'invoice',
      tenantId: TEST_TENANT_ID,
    })

    assert.lengthOf(events, 1)
    assert.equal(events[0].action, 'create_draft')
    assert.equal(events[0].entityType, 'invoice')
    assert.equal(events[0].entityId, invoice.id)
    assert.equal(events[0].actorId, ACCESS.actorId)
    assert.equal(events[0].organizationId, TEST_TENANT_ID)
  })

  test('update_draft records an audit event with changes', async ({ assert }) => {
    const service = new InvoiceService(db)
    const invoice = await service.createDraft(draftInput, ACCESS)

    await service.updateDraft(invoice.id, { ...draftInput, dueDate: '2099-06-01' }, ACCESS)

    const events = await listAuditEventsForEntity(db, {
      entityId: invoice.id,
      entityType: 'invoice',
      tenantId: TEST_TENANT_ID,
    })

    assert.lengthOf(events, 2)
    // Most recent first
    assert.equal(events[0].action, 'update_draft')
    assert.equal(events[1].action, 'create_draft')
    const changes = events[0].changes as {
      after: Record<string, unknown>
      before: Record<string, unknown>
    }
    assert.equal(changes.before.dueDate, '2099-05-01')
    assert.equal(changes.after.dueDate, '2099-06-01')
  })

  test('issue records an audit event with status transition', async ({ assert }) => {
    const service = new InvoiceService(db)
    const invoice = await service.createDraft(draftInput, ACCESS)

    await service.issueInvoice(
      invoice.id,
      { issuedCompanyAddress: '1 rue Test', issuedCompanyName: 'Test Inc.' },
      ACCESS
    )

    const events = await listAuditEventsForEntity(db, {
      entityId: invoice.id,
      entityType: 'invoice',
      tenantId: TEST_TENANT_ID,
    })

    assert.lengthOf(events, 2)
    assert.equal(events[0].action, 'issue')
    const changes = events[0].changes as {
      after: Record<string, unknown>
      before: Record<string, unknown>
    }
    assert.equal(changes.before.status, 'draft')
    assert.equal(changes.after.status, 'issued')
  })

  test('mark_paid records an audit event', async ({ assert }) => {
    const service = new InvoiceService(db)
    const invoice = await service.createDraft(draftInput, ACCESS)
    await service.issueInvoice(
      invoice.id,
      { issuedCompanyAddress: '1 rue Test', issuedCompanyName: 'Test Inc.' },
      ACCESS
    )

    await service.markInvoicePaid(invoice.id, ACCESS)

    const events = await listAuditEventsForEntity(db, {
      entityId: invoice.id,
      entityType: 'invoice',
      tenantId: TEST_TENANT_ID,
    })

    assert.lengthOf(events, 3)
    assert.equal(events[0].action, 'mark_paid')
    const changes = events[0].changes as {
      after: Record<string, unknown>
      before: Record<string, unknown>
    }
    assert.equal(changes.before.status, 'issued')
    assert.equal(changes.after.status, 'paid')
  })

  test('delete_draft records an audit event', async ({ assert }) => {
    const service = new InvoiceService(db)
    const invoice = await service.createDraft(draftInput, ACCESS)

    await service.deleteDraft(invoice.id, ACCESS)

    const events = await listAuditEventsForEntity(db, {
      entityId: invoice.id,
      entityType: 'invoice',
      tenantId: TEST_TENANT_ID,
    })

    assert.lengthOf(events, 2)
    assert.equal(events[0].action, 'delete_draft')
    assert.equal(events[1].action, 'create_draft')
  })

  test('full lifecycle produces ordered audit trail', async ({ assert }) => {
    const service = new InvoiceService(db)
    const invoice = await service.createDraft(draftInput, ACCESS)
    await service.updateDraft(invoice.id, draftInput, ACCESS)
    await service.issueInvoice(
      invoice.id,
      { issuedCompanyAddress: '1 rue Test', issuedCompanyName: 'Test Inc.' },
      ACCESS
    )
    await service.markInvoicePaid(invoice.id, ACCESS)

    const events = await listAuditEventsForEntity(db, {
      entityId: invoice.id,
      entityType: 'invoice',
      tenantId: TEST_TENANT_ID,
    })

    assert.lengthOf(events, 4)
    const actions = events.map((e) => e.action)
    assert.deepEqual(actions, ['mark_paid', 'issue', 'update_draft', 'create_draft'])
  })
})

test.group('Audit trail | expense lifecycle', (group) => {
  let cleanup: () => Promise<void>
  let db: PostgresJsDatabase<any>

  group.setup(async () => {
    const ctx = await setupTestDatabaseForGroup()
    cleanup = ctx.cleanup
    db = await app.container.make('drizzle')
    await seedTestOrganization(db)
  })

  group.each.setup(async () => {
    await db.delete(auditEvents)
    await db.delete(journalEntries)
    await db.delete(expenses)
  })

  group.teardown(async () => cleanup())

  const expenseInput = {
    amount: 12.34,
    category: 'Software',
    date: '2099-04-01',
    label: 'Audit expense',
  }

  test('create records an audit event', async ({ assert }) => {
    const service = new ExpenseService(db)
    const expense = await service.createExpense(expenseInput, ACCESS)

    const events = await listAuditEventsForEntity(db, {
      entityId: expense.id,
      entityType: 'expense',
      tenantId: TEST_TENANT_ID,
    })

    assert.lengthOf(events, 1)
    assert.equal(events[0].action, 'create')
    assert.equal(events[0].actorId, ACCESS.actorId)
  })

  test('confirm records an audit event with status transition', async ({ assert }) => {
    const service = new ExpenseService(db)
    const expense = await service.createExpense(expenseInput, ACCESS)

    await service.confirmExpense(expense.id, ACCESS)

    const events = await listAuditEventsForEntity(db, {
      entityId: expense.id,
      entityType: 'expense',
      tenantId: TEST_TENANT_ID,
    })

    assert.lengthOf(events, 2)
    assert.equal(events[0].action, 'confirm')
    const changes = events[0].changes as {
      after: Record<string, unknown>
      before: Record<string, unknown>
    }
    assert.equal(changes.before.status, 'draft')
    assert.equal(changes.after.status, 'confirmed')
  })

  test('delete records an audit event', async ({ assert }) => {
    const service = new ExpenseService(db)
    const expense = await service.createExpense(expenseInput, ACCESS)

    await service.deleteExpense(expense.id, ACCESS)

    const events = await listAuditEventsForEntity(db, {
      entityId: expense.id,
      entityType: 'expense',
      tenantId: TEST_TENANT_ID,
    })

    assert.lengthOf(events, 2)
    assert.equal(events[0].action, 'delete')
    assert.equal(events[1].action, 'create')
  })
})

test.group('Audit trail | customer lifecycle', (group) => {
  let cleanup: () => Promise<void>
  let db: PostgresJsDatabase<any>

  group.setup(async () => {
    const ctx = await setupTestDatabaseForGroup()
    cleanup = ctx.cleanup
    db = await app.container.make('drizzle')
    await seedTestOrganization(db)
  })

  group.each.setup(async () => {
    await db.delete(auditEvents)
    await db.delete(invoiceLines)
    await db.delete(journalEntries)
    await db.delete(invoices)
    await db.delete(customers)
  })

  group.teardown(async () => cleanup())

  const customerInput = {
    address: '1 rue Customer',
    company: 'Customer Audit Co',
    email: 'customer-audit@test.com',
    name: 'Customer Tester',
    note: 'Initial note',
    phone: '+33 1 00 00 00 03',
  }

  test('create records an audit event', async ({ assert }) => {
    const service = new CustomerService(db)
    const customer = await service.createCustomer(customerInput, ACCESS)

    const events = await listAuditEventsForEntity(db, {
      entityId: customer.id,
      entityType: 'customer',
      tenantId: TEST_TENANT_ID,
    })

    assert.lengthOf(events, 1)
    assert.equal(events[0].action, 'create')
    assert.equal(events[0].actorId, ACCESS.actorId)
  })

  test('update records an audit event with changes', async ({ assert }) => {
    const service = new CustomerService(db)
    const customer = await service.createCustomer(customerInput, ACCESS)

    await service.updateCustomer(
      customer.id,
      { ...customerInput, company: 'Customer Audit Co 2', note: 'Updated note' },
      ACCESS
    )

    const events = await listAuditEventsForEntity(db, {
      entityId: customer.id,
      entityType: 'customer',
      tenantId: TEST_TENANT_ID,
    })

    assert.lengthOf(events, 2)
    assert.equal(events[0].action, 'update')
    const changes = events[0].changes as {
      after: Record<string, unknown>
      before: Record<string, unknown>
    }
    assert.equal(changes.before.company, 'Customer Audit Co')
    assert.equal(changes.after.company, 'Customer Audit Co 2')
    assert.equal(changes.before.note, 'Initial note')
    assert.equal(changes.after.note, 'Updated note')
  })

  test('delete records an audit event', async ({ assert }) => {
    const service = new CustomerService(db)
    const customer = await service.createCustomer(customerInput, ACCESS)

    await service.deleteCustomer(customer.id, ACCESS)

    const events = await listAuditEventsForEntity(db, {
      entityId: customer.id,
      entityType: 'customer',
      tenantId: TEST_TENANT_ID,
    })

    assert.lengthOf(events, 2)
    assert.equal(events[0].action, 'delete')
    assert.equal(events[1].action, 'create')
  })
})

test.group('Audit trail | cross-tenant isolation', (group) => {
  let cleanup: () => Promise<void>
  let db: PostgresJsDatabase<any>

  const TENANT_A = 'audit-tenant-a'
  const TENANT_B = 'audit-tenant-b'

  const accessA: AccountingAccessContext = {
    actorId: 'actor-a',
    isAnonymous: false,
    requestId: 'audit-iso',
    tenantId: TENANT_A,
  }
  const accessB: AccountingAccessContext = {
    actorId: 'actor-b',
    isAnonymous: false,
    requestId: 'audit-iso',
    tenantId: TENANT_B,
  }

  group.setup(async () => {
    const ctx = await setupTestDatabaseForGroup()
    cleanup = ctx.cleanup
    db = await app.container.make('drizzle')

    const { organization } = await import('#core/user_management/drizzle/schema')
    await db.insert(organization).values([
      { id: TENANT_A, name: 'Audit Tenant A', slug: 'audit-tenant-a' },
      { id: TENANT_B, name: 'Audit Tenant B', slug: 'audit-tenant-b' },
    ])
  })

  group.each.setup(async () => {
    await db.delete(auditEvents)
    await db.delete(expenses)
    await db.delete(journalEntries)
    await db.delete(invoiceLines)
    await db.delete(invoices)
    await db.delete(customers)
  })

  group.teardown(async () => cleanup())

  test('audit events from tenant A are not visible to tenant B', async ({ assert }) => {
    const customerIdA = 'audit-iso-cust-a'
    await db.insert(customers).values({
      address: 'A street',
      company: 'Co A',
      email: 'a@a.com',
      id: customerIdA,
      name: 'A',
      organizationId: TENANT_A,
      phone: '+33 1 00 00 00 01',
    })

    const customerIdB = 'audit-iso-cust-b'
    await db.insert(customers).values({
      address: 'B street',
      company: 'Co B',
      email: 'b@b.com',
      id: customerIdB,
      name: 'B',
      organizationId: TENANT_B,
      phone: '+33 1 00 00 00 02',
    })

    const serviceA = new InvoiceService(db)
    const serviceB = new InvoiceService(db)

    const invoiceA = await serviceA.createDraft(
      {
        customerId: customerIdA,
        dueDate: '2099-05-01',
        issueDate: '2099-04-01',
        lines: [{ description: 'A work', quantity: 1, unitPrice: 50, vatRate: 20 }],
      },
      accessA
    )

    const invoiceB = await serviceB.createDraft(
      {
        customerId: customerIdB,
        dueDate: '2099-05-01',
        issueDate: '2099-04-01',
        lines: [{ description: 'B work', quantity: 1, unitPrice: 50, vatRate: 20 }],
      },
      accessB
    )

    // Tenant A sees only their event
    const eventsA = await listAuditEventsForEntity(db, {
      entityId: invoiceA.id,
      entityType: 'invoice',
      tenantId: TENANT_A,
    })
    assert.lengthOf(eventsA, 1)
    assert.equal(eventsA[0].organizationId, TENANT_A)

    // Tenant B sees only their event
    const eventsB = await listAuditEventsForEntity(db, {
      entityId: invoiceB.id,
      entityType: 'invoice',
      tenantId: TENANT_B,
    })
    assert.lengthOf(eventsB, 1)
    assert.equal(eventsB[0].organizationId, TENANT_B)

    // Tenant A cannot see tenant B's events even if they know the entity ID
    const crossLeak = await listAuditEventsForEntity(db, {
      entityId: invoiceB.id,
      entityType: 'invoice',
      tenantId: TENANT_A,
    })
    assert.lengthOf(crossLeak, 0)
  })

  test('expense audit events are tenant-scoped', async ({ assert }) => {
    const serviceA = new ExpenseService(db)
    const serviceB = new ExpenseService(db)

    const expenseA = await serviceA.createExpense(
      {
        amount: 10,
        category: 'Software',
        date: '2099-04-01',
        label: 'Expense A',
      },
      accessA
    )

    const expenseB = await serviceB.createExpense(
      {
        amount: 20,
        category: 'Software',
        date: '2099-04-01',
        label: 'Expense B',
      },
      accessB
    )

    const eventsA = await listAuditEventsForEntity(db, {
      entityId: expenseA.id,
      entityType: 'expense',
      tenantId: TENANT_A,
    })
    assert.lengthOf(eventsA, 1)
    assert.equal(eventsA[0].organizationId, TENANT_A)

    const crossLeak = await listAuditEventsForEntity(db, {
      entityId: expenseB.id,
      entityType: 'expense',
      tenantId: TENANT_A,
    })
    assert.lengthOf(crossLeak, 0)
  })

  test('customer audit events are tenant-scoped', async ({ assert }) => {
    const serviceA = new CustomerService(db)
    const serviceB = new CustomerService(db)

    const customerA = await serviceA.createCustomer(
      {
        address: 'Tenant A street',
        company: 'Tenant A Co',
        email: 'tenant-a@test.com',
        name: 'Tenant A',
        phone: '+33 1 00 00 00 04',
      },
      accessA
    )

    const customerB = await serviceB.createCustomer(
      {
        address: 'Tenant B street',
        company: 'Tenant B Co',
        email: 'tenant-b@test.com',
        name: 'Tenant B',
        phone: '+33 1 00 00 00 05',
      },
      accessB
    )

    const eventsA = await listAuditEventsForEntity(db, {
      entityId: customerA.id,
      entityType: 'customer',
      tenantId: TENANT_A,
    })
    assert.lengthOf(eventsA, 1)
    assert.equal(eventsA[0].organizationId, TENANT_A)

    const crossLeak = await listAuditEventsForEntity(db, {
      entityId: customerB.id,
      entityType: 'customer',
      tenantId: TENANT_A,
    })
    assert.lengthOf(crossLeak, 0)
  })
})
