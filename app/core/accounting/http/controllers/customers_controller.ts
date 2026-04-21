import type { HttpContext } from '@adonisjs/core/http'

import {
  ACCOUNTING_READ_ONLY_MESSAGE,
  AuditTrailHealthService,
} from '#core/accounting/application/audit/audit_trail_health_service'
import { CustomerService } from '#core/accounting/application/customers/index'
import { accountingAccessFromSession } from '#core/accounting/application/support/access_context'
import { DEFAULT_LIST_PER_PAGE } from '#core/accounting/application/support/pagination'
import { renderInertiaPage } from '#core/common/http/types/inertia_render_props'
import { getRequestIdFromHttpContext } from '#core/common/logging/request_id'
import { inject } from '@adonisjs/core'
import app from '@adonisjs/core/services/app'

import { flashAction } from '../helpers/flash_action.js'
import {
  customerIndexValidator,
  customerParamsValidator,
  saveCustomerValidator,
} from '../validators/customer.js'

export default class CustomersController {
  @inject()
  async destroy(ctx: HttpContext, customerService: CustomerService) {
    const { params } = await ctx.request.validateUsing(customerParamsValidator)
    const access = accountingAccessFromSession(ctx.authSession, getRequestIdFromHttpContext(ctx))

    await flashAction(
      ctx,
      () => customerService.deleteCustomer(params.id, access),
      'Customer deleted.'
    )

    return this.redirectToCustomers(ctx)
  }

  @inject()
  async index(ctx: HttpContext, customerService: CustomerService) {
    const { page, perPage, search } = await ctx.request.validateUsing(customerIndexValidator)
    const access = accountingAccessFromSession(ctx.authSession, getRequestIdFromHttpContext(ctx))
    const customers = await customerService.listCustomersPage(
      page ?? 1,
      perPage ?? DEFAULT_LIST_PER_PAGE,
      access,
      search
    )
    const accountingReadOnly = await this.isAccountingReadOnly()

    return renderInertiaPage(ctx.inertia, 'app/customers', {
      accountingReadOnly,
      accountingReadOnlyMessage: ACCOUNTING_READ_ONLY_MESSAGE,
      customers,
      filters: { search: search ?? '' },
    })
  }

  @inject()
  async store(ctx: HttpContext, customerService: CustomerService) {
    const payload = await ctx.request.validateUsing(saveCustomerValidator)
    const access = accountingAccessFromSession(ctx.authSession, getRequestIdFromHttpContext(ctx))

    await flashAction(
      ctx,
      () => customerService.createCustomer(payload, access),
      'Customer created.'
    )

    return this.redirectToCustomers(ctx)
  }

  @inject()
  async update(ctx: HttpContext, customerService: CustomerService) {
    const { params } = await ctx.request.validateUsing(customerParamsValidator)
    const payload = await ctx.request.validateUsing(saveCustomerValidator)
    const access = accountingAccessFromSession(ctx.authSession, getRequestIdFromHttpContext(ctx))

    await flashAction(
      ctx,
      () => customerService.updateCustomer(params.id, payload, access),
      'Customer updated.'
    )

    return this.redirectToCustomers(ctx)
  }

  private async isAccountingReadOnly(): Promise<boolean> {
    const healthService = await app.container.make(AuditTrailHealthService)
    return !(await healthService.isHealthy())
  }

  private redirectToCustomers(ctx: HttpContext) {
    const page = Number(ctx.request.input('page'))
    const perPage = Number(ctx.request.input('perPage'))
    const search = String(ctx.request.input('search') ?? '').trim()
    const qs: Record<string, number> = {}
    const strQs: Record<string, string> = {}

    if (Number.isFinite(page) && page > 1) qs.page = page
    if (Number.isFinite(perPage) && perPage !== DEFAULT_LIST_PER_PAGE) qs.perPage = perPage
    if (search) strQs.search = search

    return ctx.response
      .redirect()
      .toRoute(
        'customers.page',
        [],
        Object.keys({ ...qs, ...strQs }).length > 0 ? { qs: { ...qs, ...strQs } } : undefined
      )
  }
}
