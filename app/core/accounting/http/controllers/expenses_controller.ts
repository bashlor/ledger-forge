import type { DateFilter } from '#core/accounting/application/expenses/index'
import type { HttpContext } from '@adonisjs/core/http'

import { getAccountingReadOnlyState } from '#core/accounting/application/audit/accounting_readonly_policy'
import { ExpenseService } from '#core/accounting/application/expenses/index'
import { accountingAccessFromSession } from '#core/accounting/application/support/access_context'
import { DEFAULT_LIST_PER_PAGE } from '#core/accounting/application/support/pagination'
import { getRequestIdFromHttpContext } from '#core/common/logging/request_id'
import { AuthorizationService } from '#core/user_management/application/authorization_service'
import { inject } from '@adonisjs/core'

import { flashAction } from '../helpers/flash_action.js'
import {
  createExpenseValidator,
  EXPENSE_CATEGORIES,
  expenseIndexValidator,
  expenseParamsValidator,
} from '../validators/expense.js'

export default class ExpensesController {
  @inject()
  async confirmDraftExpense(ctx: HttpContext, expenseService: ExpenseService) {
    const { params } = await ctx.request.validateUsing(expenseParamsValidator)
    const access = accountingAccessFromSession(ctx.authSession, getRequestIdFromHttpContext(ctx))

    await flashAction(
      ctx,
      () => expenseService.confirmExpense(params.id, access),
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
      () => expenseService.deleteExpense(params.id, access),
      'Draft expense deleted.'
    )

    return this.redirectToExpenses(ctx)
  }

  @inject()
  async index(
    ctx: HttpContext,
    authorizationService: AuthorizationService,
    expenseService: ExpenseService
  ) {
    const { endDate, page, perPage, search, startDate } =
      await ctx.request.validateUsing(expenseIndexValidator)
    const actor = await authorizationService.actorFromSession(ctx.authSession)
    authorizationService.authorize(actor, 'accounting.read')

    const dateFilter: DateFilter | undefined =
      startDate && endDate ? { endDate, startDate } : undefined
    const access = accountingAccessFromSession(ctx.authSession, getRequestIdFromHttpContext(ctx))
    const readOnlyState = await getAccountingReadOnlyState()

    return ctx.inertia.render(
      'app/expenses' as never,
      {
        accountingReadOnly: readOnlyState.enabled,
        accountingReadOnlyMessage: readOnlyState.message,
        categories: EXPENSE_CATEGORIES,
        expenses: await expenseService.listExpenses(
          page ?? 1,
          perPage ?? DEFAULT_LIST_PER_PAGE,
          access,
          dateFilter,
          search
        ),
        filters: { search: search ?? '' },
        summary: ctx.inertia.defer(
          () => expenseService.getSummary(access, dateFilter) as never,
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
    const perPage = Number(ctx.request.input('perPage'))
    const search = String(ctx.request.input('search') ?? '').trim()
    const startDate = ctx.request.input('startDate')
    const endDate = ctx.request.input('endDate')
    const qs: Record<string, number | string> = {}

    if (Number.isFinite(page) && page > 1) qs.page = page
    if (Number.isFinite(perPage) && perPage !== DEFAULT_LIST_PER_PAGE) qs.perPage = perPage
    if (search) qs.search = search
    if (startDate) qs.startDate = startDate
    if (endDate) qs.endDate = endDate

    return ctx.response
      .redirect()
      .toRoute('expenses.page', [], Object.keys(qs).length > 0 ? { qs } : undefined)
  }
}
