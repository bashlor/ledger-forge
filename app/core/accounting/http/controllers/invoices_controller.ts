import type { HttpContext } from '@adonisjs/core/http'

import { InvoiceService } from '#core/accounting/services/invoice_service'
import { renderInertiaPage } from '#core/common/http/types/inertia_render_props'
import { inject } from '@adonisjs/core'

import { flashAction } from '../helpers/flash_action.js'
import { invoiceParamsValidator, saveInvoiceDraftValidator } from '../validators/invoice.js'

export default class InvoicesController {
  @inject()
  async destroy(ctx: HttpContext, invoiceService: InvoiceService) {
    const { params } = await ctx.request.validateUsing(invoiceParamsValidator)

    await flashAction(
      ctx,
      () => invoiceService.deleteDraft(params.id),
      'Draft invoice deleted.',
      'Could not delete the draft.'
    )

    return ctx.response.redirect(this.invoicesUrl({}))
  }

  @inject()
  async index(ctx: HttpContext, invoiceService: InvoiceService) {
    const { inertia, request } = ctx

    return renderInertiaPage(inertia, 'app/invoices', {
      customers: await invoiceService.listCustomersForSelect(),
      initialCustomerId: request.input('customer') ?? null,
      initialInvoiceId: request.input('invoice') ?? null,
      invoices: await invoiceService.listInvoices(),
      mode: request.input('mode') === 'new' ? 'new' : 'view',
    })
  }

  @inject()
  async issue(ctx: HttpContext, invoiceService: InvoiceService) {
    const { params } = await ctx.request.validateUsing(invoiceParamsValidator)

    await flashAction(
      ctx,
      () => invoiceService.issueInvoice(params.id),
      'Invoice issued.',
      'Could not issue the invoice.'
    )

    return ctx.response.redirect(this.invoicesUrl({ invoice: params.id }))
  }

  @inject()
  async markPaid(ctx: HttpContext, invoiceService: InvoiceService) {
    const { params } = await ctx.request.validateUsing(invoiceParamsValidator)

    await flashAction(
      ctx,
      () => invoiceService.markInvoicePaid(params.id),
      'Invoice marked as paid.',
      'Could not mark the invoice as paid.'
    )

    return ctx.response.redirect(this.invoicesUrl({ invoice: params.id }))
  }

  @inject()
  async store(ctx: HttpContext, invoiceService: InvoiceService) {
    const payload = await ctx.request.validateUsing(saveInvoiceDraftValidator)

    let createdId: string | undefined

    await flashAction(
      ctx,
      async () => {
        const created = await invoiceService.createDraft(payload)
        createdId = created.id
      },
      'Draft invoice created.',
      'Could not save the draft.'
    )

    return ctx.response.redirect(
      createdId ? this.invoicesUrl({ invoice: createdId }) : this.invoicesUrl({ mode: 'new' })
    )
  }

  @inject()
  async updateDraft(ctx: HttpContext, invoiceService: InvoiceService) {
    const { params } = await ctx.request.validateUsing(invoiceParamsValidator)
    const payload = await ctx.request.validateUsing(saveInvoiceDraftValidator)

    await flashAction(
      ctx,
      () => invoiceService.updateDraft(params.id, payload),
      'Draft invoice updated.',
      'Could not save the draft.'
    )

    return ctx.response.redirect(this.invoicesUrl({ invoice: params.id }))
  }

  private invoicesUrl(params: { invoice?: string; mode?: 'new' }) {
    const searchParams = new URLSearchParams()
    if (params.invoice) searchParams.set('invoice', params.invoice)
    if (params.mode) searchParams.set('mode', params.mode)
    const suffix = searchParams.toString()
    return suffix ? `/invoices?${suffix}` : '/invoices'
  }
}
