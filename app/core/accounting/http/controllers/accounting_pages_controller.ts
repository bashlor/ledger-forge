import type { HttpContext } from '@adonisjs/core/http'

import { accountingStore } from '#core/accounting/services/mock_accounting_store'
import { renderInertiaPage } from '#core/common/http/types/inertia_render_props'

export default class AccountingPagesController {
  async dashboard({ inertia }: HttpContext) {
    return renderInertiaPage(inertia, 'app/dashboard', {
      dashboard: accountingStore.getDashboard(),
    })
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
}
