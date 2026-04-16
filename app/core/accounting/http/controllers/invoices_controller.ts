import type { HttpContext } from '@adonisjs/core/http'

import { InvoiceService } from '#core/accounting/services/invoice_service'
import { renderInertiaPage } from '#core/common/http/types/inertia_render_props'
import { inject } from '@adonisjs/core'

import { flashAction } from '../helpers/flash_action.js'
import {
  invoiceParamsValidator,
  issueInvoiceValidator,
  saveInvoiceDraftValidator,
} from '../validators/invoice.js'

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

    return this.redirectToInvoices(ctx)
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
    const payload = await ctx.request.validateUsing(issueInvoiceValidator)

    await flashAction(
      ctx,
      () => invoiceService.issueInvoice(params.id, payload),
      'Invoice issued.',
      'Could not issue the invoice.'
    )

    return this.redirectToInvoices(ctx, { invoice: params.id })
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

    return this.redirectToInvoices(ctx, { invoice: params.id })
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

    return createdId
      ? this.redirectToInvoices(ctx, { invoice: createdId })
      : this.redirectToInvoices(ctx, { mode: 'new' })
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

    return this.redirectToInvoices(ctx, { invoice: params.id })
  }

  private redirectToInvoices(ctx: HttpContext, qs: { invoice?: string; mode?: 'new' } = {}) {
    const params = Object.fromEntries(Object.entries(qs).filter(([, v]) => v !== undefined))
    return ctx.response
      .redirect()
      .toRoute('invoices.page', [], Object.keys(params).length > 0 ? { qs: params } : undefined)
  }
}
