import type { HttpContext } from '@adonisjs/core/http'

import { ExpenseService } from '#core/accounting/services/expense_service'
import { renderInertiaPage } from '#core/common/http/types/inertia_render_props'
import { inject } from '@adonisjs/core'

import { flashAction } from '../helpers/flash_action.js'
import { createExpenseValidator, expenseParamsValidator } from '../validators/expense.js'

const PER_PAGE = 5

export default class ExpensesController {
  @inject()
  async confirm(ctx: HttpContext, expenseService: ExpenseService) {
    const { params } = await ctx.request.validateUsing(expenseParamsValidator)

    await flashAction(
      ctx,
      () => expenseService.confirmExpense(params.id),
      'Expense confirmed.',
      'Could not confirm the expense.'
    )

    return ctx.response.redirect(this.expensesUrl(ctx))
  }

  @inject()
  async destroy(ctx: HttpContext, expenseService: ExpenseService) {
    const { params } = await ctx.request.validateUsing(expenseParamsValidator)

    await flashAction(
      ctx,
      () => expenseService.deleteExpense(params.id),
      'Draft expense deleted.',
      'Could not delete the expense.'
    )

    return ctx.response.redirect(this.expensesUrl(ctx))
  }

  @inject()
  async index(ctx: HttpContext, expenseService: ExpenseService) {
    const page = Number(ctx.request.input('page') ?? 1)

    return renderInertiaPage(ctx.inertia, 'app/expenses', {
      expenses: await expenseService.listExpenses(Number.isFinite(page) ? page : 1, PER_PAGE),
    })
  }

  @inject()
  async store(ctx: HttpContext, expenseService: ExpenseService) {
    const payload = await ctx.request.validateUsing(createExpenseValidator)

    await flashAction(
      ctx,
      () => expenseService.createExpense(payload),
      'Expense saved as draft.',
      'Could not save the expense.'
    )

    return ctx.response.redirect('/expenses')
  }

  private expensesUrl(ctx: HttpContext) {
    const page = Number(ctx.request.input('page') ?? 1)
    const safePage = Number.isFinite(page) && page > 1 ? page : 0
    return safePage ? `/expenses?page=${safePage}` : '/expenses'
  }
}
