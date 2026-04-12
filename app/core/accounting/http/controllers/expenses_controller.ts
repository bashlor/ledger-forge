import type { DateFilter } from '#core/accounting/services/expense_service'
import type { HttpContext } from '@adonisjs/core/http'

import { ExpenseService } from '#core/accounting/services/expense_service'
import { inject } from '@adonisjs/core'

import { flashAction } from '../helpers/flash_action.js'
import {
  createExpenseValidator,
  expenseIndexValidator,
  expenseParamsValidator,
} from '../validators/expense.js'

const PER_PAGE = 5

export default class ExpensesController {
  @inject()
  async confirmDraftExpense(ctx: HttpContext, expenseService: ExpenseService) {
    const { params } = await ctx.request.validateUsing(expenseParamsValidator)

    await flashAction(
      ctx,
      () => expenseService.confirmExpense(params.id),
      'Expense confirmed.',
      'Could not confirm the expense.'
    )

    return this.redirectToExpenses(ctx)
  }

  @inject()
  async deleteDraftExpense(ctx: HttpContext, expenseService: ExpenseService) {
    const { params } = await ctx.request.validateUsing(expenseParamsValidator)

    await flashAction(
      ctx,
      () => expenseService.deleteExpense(params.id),
      'Draft expense deleted.',
      'Could not delete the expense.'
    )

    return this.redirectToExpenses(ctx)
  }

  @inject()
  async index(ctx: HttpContext, expenseService: ExpenseService) {
    const { endDate, page, startDate } = await ctx.request.validateUsing(expenseIndexValidator)
    const dateFilter: DateFilter | undefined =
      startDate && endDate ? { endDate, startDate } : undefined

    return ctx.inertia.render(
      'app/expenses' as never,
      {
        expenses: await expenseService.listExpenses(page ?? 1, PER_PAGE, dateFilter),
        summary: ctx.inertia.defer(() => expenseService.getSummary(dateFilter) as never, 'summary'),
      } as never
    )
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

    return this.redirectToExpenses(ctx)
  }

  private redirectToExpenses(ctx: HttpContext) {
    const page = Number(ctx.request.input('page'))
    const startDate = ctx.request.input('startDate')
    const endDate = ctx.request.input('endDate')
    const qs: Record<string, number | string> = {}

    if (Number.isFinite(page) && page > 1) qs.page = page
    if (startDate) qs.startDate = startDate
    if (endDate) qs.endDate = endDate

    return ctx.response
      .redirect()
      .toRoute('expenses.page', [], Object.keys(qs).length > 0 ? { qs } : undefined)
  }
}
