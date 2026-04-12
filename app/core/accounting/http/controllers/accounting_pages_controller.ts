import type { HttpContext } from '@adonisjs/core/http'

import { accountingStore } from '#core/accounting/services/mock_accounting_store'
import { renderInertiaPage } from '#core/common/http/types/inertia_render_props'

const EXPENSES_PER_PAGE = 5

export default class AccountingPagesController {
  async customerDestroy(ctx: HttpContext) {
    try {
      accountingStore.deleteCustomer(ctx.request.param('id'))
      this.flashNotification(ctx, 'Customer deleted.', 'success')
    } catch (error) {
      this.flashNotification(
        ctx,
        this.messageFromError(error, 'Could not delete the customer.'),
        'error'
      )
    }

    return ctx.response.redirect('/customers')
  }

  async customersIndex({ inertia }: HttpContext) {
    return renderInertiaPage(inertia, 'app/customers', {
      customers: accountingStore.listCustomers(),
    })
  }

  async customerStore(ctx: HttpContext) {
    try {
      accountingStore.createCustomer(
        ctx.request.only(['company', 'email', 'name', 'note', 'phone'])
      )
      this.flashNotification(ctx, 'Customer created.', 'success')
    } catch (error) {
      this.flashNotification(
        ctx,
        this.messageFromError(error, 'Could not save the customer.'),
        'error'
      )
    }

    return ctx.response.redirect('/customers')
  }

  async dashboard({ inertia }: HttpContext) {
    return renderInertiaPage(inertia, 'app/dashboard', {
      dashboard: accountingStore.getDashboard(),
    })
  }

  async expenseConfirm(ctx: HttpContext) {
    const page = this.pageNumber(ctx)

    try {
      accountingStore.confirmExpense(ctx.request.param('id'))
      this.flashNotification(ctx, 'Expense confirmed.', 'success')
    } catch (error) {
      this.flashNotification(
        ctx,
        this.messageFromError(error, 'Could not confirm the expense.'),
        'error'
      )
    }

    return ctx.response.redirect(this.expensesUrl(page))
  }

  async expenseDestroy(ctx: HttpContext) {
    const page = this.pageNumber(ctx)

    try {
      accountingStore.deleteExpense(ctx.request.param('id'))
      this.flashNotification(ctx, 'Draft expense deleted.', 'success')
    } catch (error) {
      this.flashNotification(
        ctx,
        this.messageFromError(error, 'Could not delete the expense.'),
        'error'
      )
    }

    return ctx.response.redirect(this.expensesUrl(page))
  }

  async expensesIndex({ inertia, request }: HttpContext) {
    const page = Number(request.input('page') ?? 1)

    return renderInertiaPage(inertia, 'app/expenses', {
      expenses: accountingStore.listExpenses(Number.isFinite(page) ? page : 1, EXPENSES_PER_PAGE),
    })
  }

  async expenseStore(ctx: HttpContext) {
    try {
      accountingStore.createExpense(ctx.request.only(['amount', 'category', 'date', 'label']))
      this.flashNotification(ctx, 'Expense saved as draft.', 'success')
    } catch (error) {
      this.flashNotification(
        ctx,
        this.messageFromError(error, 'Could not save the expense.'),
        'error'
      )
    }

    return ctx.response.redirect(this.expensesUrl(1))
  }

  async home({ response }: HttpContext) {
    return response.redirect('/dashboard')
  }

  async invoiceDestroy(ctx: HttpContext) {
    try {
      accountingStore.deleteDraft(ctx.request.param('id'))
      this.flashNotification(ctx, 'Draft invoice deleted.', 'success')
    } catch (error) {
      this.flashNotification(
        ctx,
        this.messageFromError(error, 'Could not delete the draft.'),
        'error'
      )
    }

    return ctx.response.redirect('/invoices')
  }

  async invoiceIssue(ctx: HttpContext) {
    const id = ctx.request.param('id')

    try {
      accountingStore.issueInvoice(id)
      this.flashNotification(ctx, 'Invoice issued.', 'success')
    } catch (error) {
      this.flashNotification(
        ctx,
        this.messageFromError(error, 'Could not issue the invoice.'),
        'error'
      )
    }

    return ctx.response.redirect(this.invoicesUrl({ invoice: id }))
  }

  async invoiceMarkPaid(ctx: HttpContext) {
    const id = ctx.request.param('id')

    try {
      accountingStore.markInvoicePaid(id)
      this.flashNotification(ctx, 'Invoice marked as paid.', 'success')
    } catch (error) {
      this.flashNotification(
        ctx,
        this.messageFromError(error, 'Could not mark the invoice as paid.'),
        'error'
      )
    }

    return ctx.response.redirect(this.invoicesUrl({ invoice: id }))
  }

  async invoicesIndex({ inertia, request }: HttpContext) {
    return renderInertiaPage(inertia, 'app/invoices', {
      customers: accountingStore.listCustomers(),
      initialCustomerId: request.input('customer') ?? null,
      initialInvoiceId: request.input('invoice') ?? null,
      invoices: accountingStore.listInvoices(),
      mode: request.input('mode') === 'new' ? 'new' : 'view',
    })
  }

  async invoiceStore(ctx: HttpContext) {
    try {
      const created = accountingStore.createDraft(
        ctx.request.only(['customerId', 'dueDate', 'issueDate', 'lines'])
      )
      this.flashNotification(ctx, 'Draft invoice created.', 'success')
      return ctx.response.redirect(this.invoicesUrl({ invoice: created.id }))
    } catch (error) {
      this.flashNotification(
        ctx,
        this.messageFromError(error, 'Could not save the draft.'),
        'error'
      )
      return ctx.response.redirect(this.invoicesUrl({ mode: 'new' }))
    }
  }

  async invoiceUpdateDraft(ctx: HttpContext) {
    const id = ctx.request.param('id')

    try {
      accountingStore.updateDraft(
        id,
        ctx.request.only(['customerId', 'dueDate', 'issueDate', 'lines'])
      )
      this.flashNotification(ctx, 'Draft invoice updated.', 'success')
    } catch (error) {
      this.flashNotification(
        ctx,
        this.messageFromError(error, 'Could not save the draft.'),
        'error'
      )
    }

    return ctx.response.redirect(this.invoicesUrl({ invoice: id }))
  }

  private expensesUrl(page: number) {
    return page > 1 ? `/expenses?page=${page}` : '/expenses'
  }

  private flashNotification(ctx: HttpContext, message: string, type: 'error' | 'success') {
    ctx.session.flash('notification', { message, type })
  }

  private invoicesUrl(params: { invoice?: string; mode?: 'new' }) {
    const searchParams = new URLSearchParams()

    if (params.invoice) searchParams.set('invoice', params.invoice)
    if (params.mode) searchParams.set('mode', params.mode)

    const suffix = searchParams.toString()
    return suffix ? `/invoices?${suffix}` : '/invoices'
  }

  private messageFromError(error: unknown, fallback: string) {
    if (error instanceof Error && error.message) return error.message
    return fallback
  }

  private pageNumber(ctx: HttpContext) {
    const page = Number(ctx.request.input('page') ?? 1)
    return Number.isFinite(page) && page > 0 ? page : 1
  }
}
