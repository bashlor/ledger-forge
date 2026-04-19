import { CustomerService, type CustomerDto } from '#core/accounting/application/customers/index'
import {
  ExpenseService,
  EXPENSE_CATEGORIES,
  type ExpenseConcurrencyHooks,
  type ExpenseDto,
  type ExpenseSummary,
} from '#core/accounting/application/expenses/index'
import { DashboardService, type DashboardDto } from '#core/accounting/application/dashboard/index'
import { test } from '@japa/runner'

test.group('Accounting application public API', () => {
  test('service indexes expose stable public symbols', async ({ assert }) => {
    assert.isFunction(CustomerService)
    assert.isFunction(ExpenseService)
    assert.isFunction(DashboardService)
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

    assert.equal(customerDto.company, 'Acme')
    assert.equal(expenseDto.label, 'Coffee')
    assert.equal(expenseSummary.totalCount, 1)
    assert.deepEqual(expenseHooks, {})
    assert.deepEqual(dashboardDto.recentInvoices, [])
  })
})
