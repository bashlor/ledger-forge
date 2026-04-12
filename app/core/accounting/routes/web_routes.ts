import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const AccountingPagesController = () => import('../http/controllers/accounting_pages_controller.js')

router
  .group(() => {
    router.get('/', [AccountingPagesController, 'home']).as('home')
    router.get('/dashboard', [AccountingPagesController, 'dashboard']).as('dashboard')
    router.get('/customers', [AccountingPagesController, 'customersIndex']).as('customers.page')
    router.post('/customers', [AccountingPagesController, 'customerStore']).as('customers.store')
    router
      .delete('/customers/:id', [AccountingPagesController, 'customerDestroy'])
      .as('customers.destroy')
    router.get('/expenses', [AccountingPagesController, 'expensesIndex']).as('expenses.page')
    router.post('/expenses', [AccountingPagesController, 'expenseStore']).as('expenses.store')
    router
      .post('/expenses/:id/confirm', [AccountingPagesController, 'expenseConfirm'])
      .as('expenses.confirm')
    router
      .delete('/expenses/:id', [AccountingPagesController, 'expenseDestroy'])
      .as('expenses.destroy')
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
