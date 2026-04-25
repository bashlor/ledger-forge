import type { DateFilter } from '#core/accounting/application/expenses/index'
import type { HttpContext } from '@adonisjs/core/http'

import { getAccountingReadOnlyState } from '#core/accounting/application/audit/accounting_readonly_policy'
import { InvoiceService } from '#core/accounting/application/invoices/index'
import { accountingAccessFromActiveTenant } from '#core/accounting/application/support/access_context'
import { DEFAULT_LIST_PER_PAGE } from '#core/accounting/application/support/pagination'
import { DomainError } from '#core/common/errors/domain_error'
import { renderInertiaPage } from '#core/common/http/types/inertia_render_props'
import { getRequestIdFromHttpContext } from '#core/common/logging/request_id'
import { resolveActiveTenantContext } from '#core/user_management/application/active_tenant_context'
import { AuthorizationService } from '#core/user_management/application/authorization_service'
import { inject } from '@adonisjs/core'

import { flashAction } from '../helpers/flash_action.js'
import {
  invoiceIndexValidator,
  invoiceParamsValidator,
  issueInvoiceValidator,
  saveInvoiceDraftValidator,
} from '../validators/invoice.js'

export default class InvoicesController {
  @inject()
  async destroy(
    ctx: HttpContext,
    authorizationService: AuthorizationService,
    invoiceService: InvoiceService
  ) {
    const { params } = await ctx.request.validateUsing(invoiceParamsValidator)
    const activeTenant = await resolveActiveTenantContext(ctx.authSession, authorizationService)
    const access = accountingAccessFromActiveTenant(activeTenant, getRequestIdFromHttpContext(ctx))

    await flashAction(
      ctx,
      async () => {
        authorizationService.authorize(activeTenant.actor, 'accounting.writeDrafts')
        await invoiceService.deleteDraft(params.id, access)
      },
      'Draft invoice deleted.'
    )

    return this.redirectToInvoices(ctx)
  }

  @inject()
  async history(
    ctx: HttpContext,
    authorizationService: AuthorizationService,
    invoiceService: InvoiceService
  ) {
    const { params } = await ctx.request.validateUsing(invoiceParamsValidator)
    const activeTenant = await resolveActiveTenantContext(ctx.authSession, authorizationService)
    const access = accountingAccessFromActiveTenant(activeTenant, getRequestIdFromHttpContext(ctx))

    authorizationService.authorize(activeTenant.actor, 'auditTrail.view')

    const invoice = await invoiceService.getInvoiceById(params.id, access)
    if (!invoice) {
      throw new DomainError('Invoice not found.', 'not_found')
    }

    return ctx.response.ok({
      events: await invoiceService.listAuditEventsForInvoice(params.id, access),
    })
  }

  @inject()
  async index(
    ctx: HttpContext,
    authorizationService: AuthorizationService,
    invoiceService: InvoiceService
  ) {
    const { inertia, request } = ctx
    const activeTenant = await resolveActiveTenantContext(ctx.authSession, authorizationService)
    const access = accountingAccessFromActiveTenant(activeTenant, getRequestIdFromHttpContext(ctx))
    authorizationService.authorize(activeTenant.actor, 'accounting.read')

    const {
      customer,
      endDate,
      invoice: invoiceFromQuery,
      page,
      perPage,
      search,
      startDate,
    } = await ctx.request.validateUsing(invoiceIndexValidator)

    const dateFilter: DateFilter | undefined =
      startDate && endDate ? { endDate, startDate } : undefined

    let initialInvoiceId: null | string = invoiceFromQuery ?? null
    if (!initialInvoiceId && customer) {
      initialInvoiceId = await invoiceService.findFirstInvoiceIdForCustomer(
        customer,
        access,
        dateFilter
      )
    }

    const listResult = await invoiceService.listInvoices(
      page ?? 1,
      perPage ?? DEFAULT_LIST_PER_PAGE,
      access,
      dateFilter,
      customer ?? undefined,
      search
    )

    let { items, pagination } = listResult
    if (initialInvoiceId && !items.some((i) => i.id === initialInvoiceId)) {
      const extra = await invoiceService.getInvoiceForListScope(
        initialInvoiceId,
        { customerId: customer ?? null, dateFilter },
        access
      )
      if (extra) {
        items = [extra, ...items]
      }
    }

    const [readOnlyState] = await Promise.all([getAccountingReadOnlyState()])

    return renderInertiaPage(inertia, 'app/invoices', {
      accountingReadOnly: readOnlyState.enabled,
      accountingReadOnlyMessage: readOnlyState.message,
      canViewAuditHistory: authorizationService.allows(activeTenant.actor, 'auditTrail.view'),
      customers: await invoiceService.listCustomersForSelect(access),
      filters: { search: search ?? '' },
      initialCustomerId: customer ?? null,
      initialInvoiceId,
      invoices: { items, pagination },
      invoiceSummary: inertia.defer(
        () => invoiceService.getInvoiceSummary(access, dateFilter, customer ?? undefined) as never,
        'invoiceSummary'
      ),
      mode: request.input('mode') === 'new' ? 'new' : 'view',
    })
  }

  @inject()
  async issue(
    ctx: HttpContext,
    authorizationService: AuthorizationService,
    invoiceService: InvoiceService
  ) {
    const { params } = await ctx.request.validateUsing(invoiceParamsValidator)
    const payload = await ctx.request.validateUsing(issueInvoiceValidator)
    const activeTenant = await resolveActiveTenantContext(ctx.authSession, authorizationService)
    const access = accountingAccessFromActiveTenant(activeTenant, getRequestIdFromHttpContext(ctx))

    await flashAction(
      ctx,
      async () => {
        authorizationService.authorize(activeTenant.actor, 'invoice.issue')
        await invoiceService.issueInvoice(params.id, payload, access)
      },
      'Invoice issued.'
    )

    return this.redirectToInvoices(ctx, { invoice: params.id })
  }

  @inject()
  async markPaid(
    ctx: HttpContext,
    authorizationService: AuthorizationService,
    invoiceService: InvoiceService
  ) {
    const { params } = await ctx.request.validateUsing(invoiceParamsValidator)
    const activeTenant = await resolveActiveTenantContext(ctx.authSession, authorizationService)
    const access = accountingAccessFromActiveTenant(activeTenant, getRequestIdFromHttpContext(ctx))

    await flashAction(
      ctx,
      async () => {
        authorizationService.authorize(activeTenant.actor, 'invoice.markPaid')
        await invoiceService.markInvoicePaid(params.id, access)
      },
      'Invoice marked as paid.'
    )

    return this.redirectToInvoices(ctx, { invoice: params.id })
  }

  @inject()
  async store(
    ctx: HttpContext,
    authorizationService: AuthorizationService,
    invoiceService: InvoiceService
  ) {
    const payload = await ctx.request.validateUsing(saveInvoiceDraftValidator)
    const activeTenant = await resolveActiveTenantContext(ctx.authSession, authorizationService)
    const access = accountingAccessFromActiveTenant(activeTenant, getRequestIdFromHttpContext(ctx))

    let createdId: string | undefined

    await flashAction(
      ctx,
      async () => {
        authorizationService.authorize(activeTenant.actor, 'accounting.writeDrafts')
        const created = await invoiceService.createDraft(payload, access)
        createdId = created.id
      },
      'Draft invoice created.'
    )

    return createdId
      ? this.redirectToInvoices(ctx, { invoice: createdId })
      : this.redirectToInvoices(ctx, { mode: 'new' })
  }

  @inject()
  async updateDraft(
    ctx: HttpContext,
    authorizationService: AuthorizationService,
    invoiceService: InvoiceService
  ) {
    const { params } = await ctx.request.validateUsing(invoiceParamsValidator)
    const payload = await ctx.request.validateUsing(saveInvoiceDraftValidator)
    const activeTenant = await resolveActiveTenantContext(ctx.authSession, authorizationService)
    const access = accountingAccessFromActiveTenant(activeTenant, getRequestIdFromHttpContext(ctx))

    await flashAction(
      ctx,
      async () => {
        authorizationService.authorize(activeTenant.actor, 'accounting.writeDrafts')
        await invoiceService.updateDraft(params.id, payload, access)
      },
      'Draft invoice updated.'
    )

    return this.redirectToInvoices(ctx, { invoice: params.id })
  }
  private redirectToInvoices(
    ctx: HttpContext,
    extras: { customer?: string; invoice?: string; mode?: 'new' } = {}
  ) {
    const page = Number(ctx.request.input('page'))
    const perPage = Number(ctx.request.input('perPage'))
    const startDate = ctx.request.input('startDate')
    const endDate = ctx.request.input('endDate')
    const customer = ctx.request.input('customer')
    const search = String(ctx.request.input('search') ?? '').trim()
    const invoiceFromRequest = ctx.request.input('invoice')
    const qs: Record<string, number | string> = {}

    if (Number.isFinite(page) && page > 1) qs.page = page
    if (Number.isFinite(perPage) && perPage !== DEFAULT_LIST_PER_PAGE) qs.perPage = perPage
    if (startDate) qs.startDate = startDate
    if (endDate) qs.endDate = endDate

    const invoice = extras.invoice ?? invoiceFromRequest
    if (invoice) qs.invoice = invoice

    const customerId = extras.customer ?? customer
    if (customerId) qs.customer = customerId
    if (search) qs.search = search

    const mode = extras.mode ?? ctx.request.input('mode')
    if (mode === 'new') qs.mode = 'new'

    return ctx.response
      .redirect()
      .toRoute('invoices.page', [], Object.keys(qs).length > 0 ? { qs } : undefined)
  }
}
