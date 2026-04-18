import type { HttpContext } from '@adonisjs/core/http'

import { CustomerService } from '#core/accounting/application/customers/index'
import { accountingAccessFromSession } from '#core/accounting/application/support/access_context'
import { flashInertiaInputErrors } from '#core/common/http/presenters/inertia_input_errors'
import { renderInertiaPage } from '#core/common/http/types/inertia_render_props'
import { DomainError } from '#core/shared/domain_error'
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
      'Customer deleted.',
      'Could not delete the customer.'
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

    await this.runCustomerMutation(
      ctx,
      () => customerService.createCustomer(payload, access),
      'Customer created.',
      'Could not save the customer.'
    )

    return this.redirectToCustomers(ctx)
  }

  @inject()
  async update(ctx: HttpContext, customerService: CustomerService) {
    const { params } = await ctx.request.validateUsing(customerParamsValidator)
    const payload = await ctx.request.validateUsing(saveCustomerValidator)
    const access = accountingAccessFromSession(ctx.authSession)

    await this.runCustomerMutation(
      ctx,
      () => customerService.updateCustomer(params.id, payload, access),
      'Customer updated.',
      'Could not update the customer.'
    )

    return this.redirectToCustomers(ctx)
  }

  private customerInputErrors(error: DomainError): Record<string, string> {
    switch (error.message) {
      case 'Customer address is required.':
        return { address: error.message }
      case 'Customer company is required.':
        return { company: error.message }
      case 'Customer contact name is required.':
        return { name: error.message }
      case 'Provide at least an email or a phone number.':
        return { email: error.message, phone: error.message }
      default:
        return {}
    }
  }

  private redirectToCustomers(ctx: HttpContext) {
    const page = Number(ctx.request.input('page'))
    const qs: Record<string, number> = {}

    if (Number.isFinite(page) && page > 1) qs.page = page

    return ctx.response
      .redirect()
      .toRoute('customers.page', [], Object.keys(qs).length > 0 ? { qs } : undefined)
  }

  private async runCustomerMutation(
    ctx: HttpContext,
    action: () => Promise<unknown>,
    successMessage: string,
    fallbackMessage: string
  ) {
    try {
      await action()
      ctx.session.flash('notification', { message: successMessage, type: 'success' })
    } catch (error) {
      if (!(error instanceof DomainError) || error.type === 'not_found') throw error

      const inputErrors = this.customerInputErrors(error)
      if (Object.keys(inputErrors).length > 0) {
        flashInertiaInputErrors(ctx, inputErrors)
      }

      ctx.session.flash('notification', {
        message: error.message || fallbackMessage,
        type: 'error',
      })
    }
  }
}
