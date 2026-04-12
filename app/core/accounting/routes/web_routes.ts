import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const AccountingPagesController = () => import('../http/controllers/accounting_pages_controller.js')
const CustomersController = () => import('../http/controllers/customers_controller.js')
const ExpensesController = () => import('../http/controllers/expenses_controller.js')

router
  .group(() => {
    router.get('/', [AccountingPagesController, 'home']).as('home')

    router.get('/dashboard', [AccountingPagesController, 'dashboard']).as('dashboard')

    router.get('/customers', [CustomersController, 'index']).as('customers.page')
    router.post('/customers', [CustomersController, 'store']).as('customers.store')
    router.put('/customers/:id', [CustomersController, 'update']).as('customers.update')
    router.delete('/customers/:id', [CustomersController, 'destroy']).as('customers.destroy')

    router.get('/expenses', [ExpensesController, 'index']).as('expenses.page')
    router.post('/expenses', [ExpensesController, 'store']).as('expenses.store')
    router
      .post('/expenses/:id/confirm-draft', [ExpensesController, 'confirmDraftExpense'])
      .as('expenses.confirm_draft')
    router
      .delete('/expenses/:id', [ExpensesController, 'deleteDraftExpense'])
      .as('expenses.delete_draft')

    router.get('/invoices', [AccountingPagesController, 'invoicesIndex']).as('invoices.page')
    router.post('/invoices', [AccountingPagesController, 'invoiceStore']).as('invoices.store')
    router
      .put('/invoices/:id/draft', [AccountingPagesController, 'invoiceUpdateDraft'])
      .as('invoices.update_draft')
    router
      .post('/invoices/:id/issue', [AccountingPagesController, 'invoiceIssue'])
      .as('invoices.issue')
    router
      .post('/invoices/:id/mark-paid', [AccountingPagesController, 'invoiceMarkPaid'])
      .as('invoices.mark_paid')
    router
      .delete('/invoices/:id', [AccountingPagesController, 'invoiceDestroy'])
      .as('invoices.destroy')
  })
  .use(middleware.auth())
