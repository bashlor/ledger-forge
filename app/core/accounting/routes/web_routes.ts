import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const DashboardController = () => import('../http/controllers/dashboard_controller.js')
const DevOperatorAccessController = () =>
  import('../http/controllers/dev_operator_access_controller.js')
const DevOperatorConsoleController = () =>
  import('../http/controllers/dev_operator_console_controller.js')
const CustomersController = () => import('../http/controllers/customers_controller.js')
const ExpensesController = () => import('../http/controllers/expenses_controller.js')
const InvoicesController = () => import('../http/controllers/invoices_controller.js')

router
  .group(() => {
    router.get('/access', [DevOperatorAccessController, 'show']).as('dev.access')
    router.post('/access', [DevOperatorAccessController, 'store']).as('dev.access.store')
  })
  .prefix('/_dev')

router
  .group(() => {
    router.get('/inspector', [DevOperatorConsoleController, 'index']).as('dev.inspector')
    router
      .post('/inspector/active-tenant', [DevOperatorConsoleController, 'switchActiveTenant'])
      .as('dev.inspector.switch_tenant')
    router
      .post('/inspector/actions/:action', [DevOperatorConsoleController, 'runAction'])
      .as('dev.inspector.action')
  })
  .prefix('/_dev')
  .use([middleware.auth(), middleware.ensureActiveTenant()])

router
  .group(() => {
    router.get('/', [DashboardController, 'home']).as('home')

    router.get('/dashboard', [DashboardController, 'dashboard']).as('dashboard')

    router.get('/customers', [CustomersController, 'index']).as('customers.page')

    router.get('/expenses', [ExpensesController, 'index']).as('expenses.page')

    router.get('/invoices', [InvoicesController, 'index']).as('invoices.page')
    router.get('/invoices/:id/history', [InvoicesController, 'history']).as('invoices.history')

    router
      .group(() => {
        router.post('/customers', [CustomersController, 'store']).as('customers.store')
        router.put('/customers/:id', [CustomersController, 'update']).as('customers.update')
        router.delete('/customers/:id', [CustomersController, 'destroy']).as('customers.destroy')

        router.post('/expenses', [ExpensesController, 'store']).as('expenses.store')
        router
          .post('/expenses/:id/confirm-draft', [ExpensesController, 'confirmDraftExpense'])
          .as('expenses.confirm_draft')
        router
          .delete('/expenses/:id', [ExpensesController, 'deleteDraftExpense'])
          .as('expenses.delete_draft')

        router.post('/invoices', [InvoicesController, 'store']).as('invoices.store')
        router
          .put('/invoices/:id/draft', [InvoicesController, 'updateDraft'])
          .as('invoices.update_draft')
        router.post('/invoices/:id/issue', [InvoicesController, 'issue']).as('invoices.issue')
        router
          .post('/invoices/:id/mark-paid', [InvoicesController, 'markPaid'])
          .as('invoices.mark_paid')
        router.delete('/invoices/:id', [InvoicesController, 'destroy']).as('invoices.destroy')
      })
      .use(middleware.auditTrailWritable())
  })
  .use([middleware.auth(), middleware.ensureActiveTenant()])
