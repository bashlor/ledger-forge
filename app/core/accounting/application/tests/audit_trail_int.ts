import type {
  AuditDbExecutor,
  CriticalAuditTrail,
} from '#core/accounting/application/audit/critical_audit_trail'
import type { AuditEventInput } from '#core/accounting/application/audit/types'
import type { AccountingAccessContext } from '#core/accounting/application/support/access_context'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { listAuditEventsForEntity } from '#core/accounting/application/audit/audit_queries'
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
import { eq } from 'drizzle-orm'

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

class FailingAuditTrail implements CriticalAuditTrail {
  async record(_tx: AuditDbExecutor, _input: AuditEventInput): Promise<void> {
    throw new Error('audit write failed')
  }
}

test.group('Audit trail | critical rollback and atomicity', (group) => {
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
    await db.delete(expenses)
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

  test('txn:invoice issue rolls back when audit write fails', async ({ assert }) => {
    const service = new InvoiceService(db)
    const draft = await service.createDraft(
      {
        customerId: TEST_CUSTOMER_ID,
        dueDate: '2099-05-01',
        issueDate: '2099-04-01',
        lines: [{ description: 'Consulting', quantity: 1, unitPrice: 100, vatRate: 20 }],
      },
      ACCESS
    )
    const failingService = new InvoiceService(db, { auditTrail: new FailingAuditTrail() })

    await assert.rejects(
      () =>
        failingService.issueInvoice(
          draft.id,
          { issuedCompanyAddress: '1 rue Test', issuedCompanyName: 'Test Inc.' },
          ACCESS
        ),
      'audit write failed'
    )

    const [persistedInvoice] = await db
      .select({ status: invoices.status })
      .from(invoices)
      .where(eq(invoices.id, draft.id))
    const entries = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.invoiceId, draft.id))

    assert.equal(persistedInvoice.status, 'draft')
    assert.lengthOf(entries, 0)
  })

  test('txn:expense confirm stays atomic with journal entry', async ({ assert }) => {
    const service = new ExpenseService(db)
    const expense = await service.createExpense(
      { amount: 42, category: 'Software', date: '2099-04-01', label: 'Atomic expense' },
      ACCESS
    )
    await service.confirmExpense(expense.id, ACCESS)

    const [row] = await db.select().from(expenses).where(eq(expenses.id, expense.id))
    const entries = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.expenseId, expense.id))

    assert.equal(row.status, 'confirmed')
    assert.equal(entries.length, 1)
  })
})

test.group('Audit trail | isolation smoke', (group) => {
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

  group.setup(async () => {
    const ctx = await setupTestDatabaseForGroup()
    cleanup = ctx.cleanup
    db = await app.container.make('drizzle')
    await db.insert(organization).values([
      { id: TENANT_A, name: 'Audit Tenant A', slug: 'audit-tenant-a' },
      { id: TENANT_B, name: 'Audit Tenant B', slug: 'audit-tenant-b' },
    ])
  })

  group.each.setup(async () => {
    await db.delete(auditEvents)
    await db.delete(invoiceLines)
    await db.delete(invoices)
    await db.delete(customers)
  })

  group.teardown(async () => cleanup())

  test('isolation:tenant cannot query audit events from another tenant', async ({ assert }) => {
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

    const serviceB = new InvoiceService(db)
    const invoiceB = await serviceB.createDraft(
      {
        customerId: customerIdB,
        dueDate: '2099-05-01',
        issueDate: '2099-04-01',
        lines: [{ description: 'B work', quantity: 1, unitPrice: 50, vatRate: 20 }],
      },
      { ...accessA, tenantId: TENANT_B }
    )

    const crossLeak = await listAuditEventsForEntity(db, {
      entityId: invoiceB.id,
      entityType: 'invoice',
      tenantId: TENANT_A,
    })
    assert.lengthOf(crossLeak, 0)
  })
})
