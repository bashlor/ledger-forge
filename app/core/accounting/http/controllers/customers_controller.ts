import type { HttpContext } from '@adonisjs/core/http'

import { CustomerService } from '#core/accounting/application/customers/index'
import { accountingAccessFromSession } from '#core/accounting/application/support/access_context'
import { renderInertiaPage } from '#core/common/http/types/inertia_render_props'
import { inject } from '@adonisjs/core'

import { flashAction } from '../helpers/flash_action.js'
import {
  customerIndexValidator,
  customerParamsValidator,
  saveCustomerValidator,
} from '../validators/customer.js'

const PER_PAGE = 5

export default class CustomersController {
  @inject()
  async destroy(ctx: HttpContext, customerService: CustomerService) {
    const { params } = await ctx.request.validateUsing(customerParamsValidator)
    const access = accountingAccessFromSession(ctx.authSession)

    await flashAction(
      ctx,
      () => customerService.deleteCustomer(params.id, access),
      'Customer deleted.'
    )

    return this.redirectToCustomers(ctx)
  }

  @inject()
  async index(ctx: HttpContext, customerService: CustomerService) {
    const { page } = await ctx.request.validateUsing(customerIndexValidator)
    const access = accountingAccessFromSession(ctx.authSession)
    const customers = await customerService.listCustomersPage(page ?? 1, PER_PAGE, access)

    return renderInertiaPage(ctx.inertia, 'app/customers', { customers })
  }

  @inject()
  async store(ctx: HttpContext, customerService: CustomerService) {
    const payload = await ctx.request.validateUsing(saveCustomerValidator)
    const access = accountingAccessFromSession(ctx.authSession)

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
    const access = accountingAccessFromSession(ctx.authSession)

    await flashAction(
      ctx,
      () => customerService.updateCustomer(params.id, payload, access),
      'Customer updated.'
    )

    return this.redirectToCustomers(ctx)
  }

  private redirectToCustomers(ctx: HttpContext) {
    const page = Number(ctx.request.input('page'))
    const qs: Record<string, number> = {}

    if (Number.isFinite(page) && page > 1) qs.page = page

    return ctx.response
      .redirect()
      .toRoute('customers.page', [], Object.keys(qs).length > 0 ? { qs } : undefined)
  }
}
