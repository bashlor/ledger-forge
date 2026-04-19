import type { DateFilter } from '#core/accounting/application/expenses/index'
import type { HttpContext } from '@adonisjs/core/http'

import { ExpenseService } from '#core/accounting/application/expenses/index'
import { accountingAccessFromSession } from '#core/accounting/application/support/access_context'
import { getRequestIdFromHttpContext } from '#core/common/logging/request_id'
import { inject } from '@adonisjs/core'

import { flashAction } from '../helpers/flash_action.js'
import {
  createExpenseValidator,
  EXPENSE_CATEGORIES,
  expenseIndexValidator,
  expenseParamsValidator,
} from '../validators/expense.js'

const PER_PAGE = 5

export default class ExpensesController {
  @inject()
  async confirmDraftExpense(ctx: HttpContext, expenseService: ExpenseService) {
    const { params } = await ctx.request.validateUsing(expenseParamsValidator)
    const access = accountingAccessFromSession(ctx.authSession, getRequestIdFromHttpContext(ctx))

    await flashAction(
      ctx,
      () => expenseService.confirmExpense(params.id, undefined, access),
      'Expense confirmed.'
    )

    return this.redirectToExpenses(ctx)
  }

  @inject()
  async deleteDraftExpense(ctx: HttpContext, expenseService: ExpenseService) {
    const { params } = await ctx.request.validateUsing(expenseParamsValidator)
    const access = accountingAccessFromSession(ctx.authSession, getRequestIdFromHttpContext(ctx))

    await flashAction(
      ctx,
      () => expenseService.deleteExpense(params.id, undefined, access),
      'Draft expense deleted.'
    )

    return this.redirectToExpenses(ctx)
  }

  @inject()
  async index(ctx: HttpContext, expenseService: ExpenseService) {
    const { endDate, page, startDate } = await ctx.request.validateUsing(expenseIndexValidator)
    const dateFilter: DateFilter | undefined =
      startDate && endDate ? { endDate, startDate } : undefined
    const access = accountingAccessFromSession(ctx.authSession, getRequestIdFromHttpContext(ctx))

    return ctx.inertia.render(
      'app/expenses' as never,
      {
        categories: EXPENSE_CATEGORIES,
        expenses: await expenseService.listExpenses(page ?? 1, PER_PAGE, dateFilter, access),
        summary: ctx.inertia.defer(
          () => expenseService.getSummary(dateFilter, access) as never,
          'summary'
        ),
      } as never
    )
  }

  @inject()
  async store(ctx: HttpContext, expenseService: ExpenseService) {
    const payload = await ctx.request.validateUsing(createExpenseValidator)
    const access = accountingAccessFromSession(ctx.authSession, getRequestIdFromHttpContext(ctx))

    await flashAction(
      ctx,
      () => expenseService.createExpense(payload, access),
      'Expense saved as draft.'
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
