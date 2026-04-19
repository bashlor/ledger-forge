import type { AccountingActivitySink } from '#core/accounting/application/support/activity_log'
import type { AccountingServiceDependencies } from '#core/accounting/application/support/service_dependencies'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import {
  type AccountingAccessContext,
  SYSTEM_ACCOUNTING_ACCESS_CONTEXT,
} from '#core/accounting/application/support/access_context'
import { clampInteger } from '#core/accounting/application/support/pagination'
import { DomainError } from '#core/common/errors/domain_error'

export { EXPENSE_CATEGORIES } from '#core/accounting/expense_categories'
export type { ExpenseCategory } from '#core/accounting/expense_categories'
import type {
  CreateExpenseInput,
  DateFilter,
  ExpenseConcurrencyHooks,
  ExpenseDto,
  ExpenseListResult,
  ExpenseSummary,
} from './types.js'

import {
  confirmDraftExpense,
  deleteDraftExpense,
  insertDraftExpense,
  insertExpenseJournalEntry,
} from './commands.js'
import { toExpenseDto } from './mappers.js'
import { findExpenseById, getExpenseSummary, listExpenseRows } from './queries.js'
import { MAX_PER_PAGE, MIN_PER_PAGE } from './types.js'
import { normalizeExpenseInput } from './validation.js'

export class ExpenseService {
  private readonly activitySink?: AccountingActivitySink

  constructor(
    private readonly db: PostgresJsDatabase<any>,
    dependencies: AccountingServiceDependencies = {}
  ) {
    this.activitySink = dependencies.activitySink
  }

  async confirmExpense(
    id: string,
    hooks?: ExpenseConcurrencyHooks,
    access: AccountingAccessContext = SYSTEM_ACCOUNTING_ACCESS_CONTEXT
  ): Promise<ExpenseDto> {
    const result = await this.db.transaction(async (tx) => {
      const existing = await findExpenseById(tx, id)
      if (!existing) {
        throw new DomainError('Expense not found.', 'not_found')
      }
      await hooks?.afterRead?.()

      const updated = await confirmDraftExpense(tx, id)

      if (!updated) {
        const again = await findExpenseById(tx, id)
        if (!again) {
          throw new DomainError('Expense not found.', 'not_found')
        }
        throw new DomainError('Only draft expenses can be confirmed.', 'business_logic_error')
      }

      await insertExpenseJournalEntry(tx, {
        amountCents: updated.amountCents,
        date: updated.date,
        expenseId: updated.id,
        label: updated.label,
      })

      return toExpenseDto(updated)
    })

    await this.activitySink?.record({
      actorId: access.actorId,
      boundedContext: 'accounting',
      isAnonymous: access.isAnonymous,
      operation: 'confirm_expense',
      outcome: 'success',
      resourceId: id,
      resourceType: 'expense',
    })

    return result
  }

  async createExpense(
    input: CreateExpenseInput,
    access: AccountingAccessContext = SYSTEM_ACCOUNTING_ACCESS_CONTEXT
  ): Promise<ExpenseDto> {
    const normalized = normalizeExpenseInput(input)
    const row = await insertDraftExpense(this.db, normalized)

    await this.activitySink?.record({
      actorId: access.actorId,
      boundedContext: 'accounting',
      isAnonymous: access.isAnonymous,
      operation: 'create_expense',
      outcome: 'success',
      resourceId: row.id,
      resourceType: 'expense',
    })

    return toExpenseDto(row)
  }

  async deleteExpense(
    id: string,
    hooks?: ExpenseConcurrencyHooks,
    access: AccountingAccessContext = SYSTEM_ACCOUNTING_ACCESS_CONTEXT
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      const existing = await findExpenseById(tx, id)
      if (!existing) {
        throw new DomainError('Expense not found.', 'not_found')
      }
      await hooks?.afterRead?.()

      const deleted = await deleteDraftExpense(tx, id)

      if (!deleted) {
        const again = await findExpenseById(tx, id)
        if (!again) {
          throw new DomainError('Expense not found.', 'not_found')
        }
        throw new DomainError('Only draft expenses can be deleted.', 'business_logic_error')
      }
    })

    await this.activitySink?.record({
      actorId: access.actorId,
      boundedContext: 'accounting',
      isAnonymous: access.isAnonymous,
      operation: 'delete_expense',
      outcome: 'success',
      resourceId: id,
      resourceType: 'expense',
    })
  }

  async getSummary(
    dateFilter?: DateFilter,
    _access: AccountingAccessContext = SYSTEM_ACCOUNTING_ACCESS_CONTEXT
  ): Promise<ExpenseSummary> {
    return getExpenseSummary(this.db, dateFilter)
  }

  async listExpenses(
    page = 1,
    perPage = 5,
    dateFilter?: DateFilter,
    _access: AccountingAccessContext = SYSTEM_ACCOUNTING_ACCESS_CONTEXT
  ): Promise<ExpenseListResult> {
    const safePerPage = clampInteger(perPage, MIN_PER_PAGE, MAX_PER_PAGE)
    const requestedPage = clampInteger(page, 1, Number.MAX_SAFE_INTEGER)
    const { pagination, rows } = await listExpenseRows(
      this.db,
      requestedPage,
      safePerPage,
      dateFilter
    )

    return {
      items: rows.map(toExpenseDto),
      pagination,
    }
  }
}
