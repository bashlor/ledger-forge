import type { HttpContext } from '@adonisjs/core/http'

import { CustomerService } from '#core/accounting/services/customer_service'
import { renderInertiaPage } from '#core/common/http/types/inertia_render_props'
import { inject } from '@adonisjs/core'

import { flashAction } from '../helpers/flash_action.js'
import {
  customerIndexValidator,
  customerParamsValidator,
  saveCustomerValidator,
} from '../validators/customer.js'

const PER_PAGE = 5
const CONTACT_REQUIRED_MESSAGE = 'Provide at least an email or a phone number.'

export default class CustomersController {
  @inject()
  async destroy(ctx: HttpContext, customerService: CustomerService) {
    const { params } = await ctx.request.validateUsing(customerParamsValidator)

    await flashAction(
      ctx,
      () => customerService.deleteCustomer(params.id),
      'Customer deleted.',
      'Could not delete the customer.'
    )

    return this.redirectToCustomers(ctx)
  }

  @inject()
  async index(ctx: HttpContext, customerService: CustomerService) {
    const { page } = await ctx.request.validateUsing(customerIndexValidator)
    const customers = await customerService.listCustomersPage(page ?? 1, PER_PAGE)

    return renderInertiaPage(ctx.inertia, 'app/customers', {
      customers: {
        ...customers,
        items: customers.items.map((item) => ({
          ...item,
          canDelete: item.canDelete ?? item.invoiceCount === 0,
          invoiceCount: item.invoiceCount ?? 0,
          totalInvoiced: item.totalInvoiced ?? 0,
        })),
      },
    })
  }

  @inject()
  async store(ctx: HttpContext, customerService: CustomerService) {
    const payload = await ctx.request.validateUsing(saveCustomerValidator)
    if (!this.hasContactMethod(payload.email, payload.phone)) {
      return this.respondMissingContact(ctx)
    }

    await flashAction(
      ctx,
      () => customerService.createCustomer(payload),
      'Customer created.',
      'Could not save the customer.'
    )

    return this.redirectToCustomers(ctx)
  }

  @inject()
  async update(ctx: HttpContext, customerService: CustomerService) {
    const { params } = await ctx.request.validateUsing(customerParamsValidator)
    const payload = await ctx.request.validateUsing(saveCustomerValidator)
    if (!this.hasContactMethod(payload.email, payload.phone)) {
      return this.respondMissingContact(ctx)
    }

    await flashAction(
      ctx,
      () => customerService.updateCustomer(params.id, payload),
      'Customer updated.',
      'Could not update the customer.'
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

  private hasContactMethod(email?: string, phone?: string) {
    return Boolean(email?.trim() || phone?.trim())
  }

  private respondMissingContact(ctx: HttpContext) {
    ctx.session.flash('errors', {
      email: CONTACT_REQUIRED_MESSAGE,
      phone: CONTACT_REQUIRED_MESSAGE,
    })
    return this.redirectToCustomers(ctx)
  }
}
