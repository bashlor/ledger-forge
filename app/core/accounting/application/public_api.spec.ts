import { type CustomerDto, CustomerService } from '#core/accounting/application/customers/index'
import { type DashboardDto, DashboardService } from '#core/accounting/application/dashboard/index'
import {
  EXPENSE_CATEGORIES,
  type ExpenseConcurrencyHooks,
  type ExpenseDto,
  ExpenseService,
  type ExpenseSummary,
} from '#core/accounting/application/expenses/index'
import {
  createInvoiceUseCase,
  type InvoiceDto,
  InvoiceService,
  type InvoiceStatus,
} from '#core/accounting/application/invoices/index'
import { test } from '@japa/runner'

test.group('Accounting application public API', () => {
  test('service indexes expose stable public symbols', async ({ assert }) => {
    assert.isFunction(CustomerService)
    assert.isFunction(ExpenseService)
    assert.isFunction(DashboardService)
    assert.isFunction(InvoiceService)
    assert.isFunction(createInvoiceUseCase)
    assert.isArray(EXPENSE_CATEGORIES)

    const customerDto: CustomerDto = {
      address: '1 rue de test',
      canDelete: true,
      company: 'Acme',
      email: 'contact@acme.test',
      id: 'customer-1',
      invoiceCount: 0,
      name: 'Alice',
      phone: '+33 6 00 00 00 00',
      totalInvoiced: 0,
    }
    const expenseDto: ExpenseDto = {
      amount: 12.5,
      canConfirm: true,
      canDelete: true,
      canEdit: true,
      category: EXPENSE_CATEGORIES[0],
      date: '2026-04-01',
      id: 'expense-1',
      label: 'Coffee',
      status: 'draft',
    }
    const expenseSummary: ExpenseSummary = {
      confirmedCount: 0,
      draftCount: 1,
      totalAmount: 0,
      totalCount: 1,
    }
    const expenseHooks: ExpenseConcurrencyHooks = {}
    const dashboardDto: DashboardDto = {
      recentInvoices: [],
      summary: {
        profit: 0,
        totalCollected: 0,
        totalExpenses: 0,
        totalRevenue: 0,
      },
    }
    const invoiceStatus: InvoiceStatus = 'draft'
    const invoiceDto: InvoiceDto = {
      createdAt: '2026-04-01',
      customerCompanyAddressSnapshot: '1 rue de test',
      customerCompanyName: 'Acme',
      customerCompanySnapshot: 'Acme',
      customerEmailSnapshot: 'contact@acme.test',
      customerId: 'customer-1',
      customerPhoneSnapshot: '+33 6 00 00 00 00',
      customerPrimaryContactSnapshot: 'Alice',
      dueDate: '2026-04-10',
      id: 'invoice-1',
      invoiceNumber: 'INV-2026-001',
      issueDate: '2026-04-01',
      issuedCompanyAddress: '',
      issuedCompanyName: '',
      lines: [],
      status: invoiceStatus,
      subtotalExclTax: 0,
      totalInclTax: 0,
      totalVat: 0,
    }

    assert.equal(customerDto.company, 'Acme')
    assert.equal(expenseDto.label, 'Coffee')
    assert.equal(expenseSummary.totalCount, 1)
    assert.deepEqual(expenseHooks, {})
    assert.deepEqual(dashboardDto.recentInvoices, [])
    assert.equal(invoiceDto.invoiceNumber, 'INV-2026-001')
  })

  test('invoice index hides internal db helpers', async ({ assert }) => {
    const invoiceApi = await import('#core/accounting/application/invoices/index')

    assert.isUndefined((invoiceApi as Record<string, unknown>).insertInvoice)
    assert.isUndefined((invoiceApi as Record<string, unknown>).getInvoiceById)
    assert.isUndefined((invoiceApi as Record<string, unknown>).assertInvoiceCanBeSent)
  })

  test('customers and expenses indexes hide internal persistence helpers', async ({ assert }) => {
    const customersApi = await import('#core/accounting/application/customers/index')
    const expensesApi = await import('#core/accounting/application/expenses/index')

    assert.isUndefined((customersApi as Record<string, unknown>).insertCustomer)
    assert.isUndefined((customersApi as Record<string, unknown>).listCustomersWithAggregates)
    assert.isUndefined((expensesApi as Record<string, unknown>).confirmDraftExpense)
    assert.isUndefined((expensesApi as Record<string, unknown>).listExpenseRows)
  })
})
