import type { AccountingActivitySink } from '#core/accounting/application/support/activity_log'
import type { AccountingServiceDependencies } from '#core/accounting/application/support/service_dependencies'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import {
  type CriticalAuditTrail,
  DatabaseCriticalAuditTrail,
} from '#core/accounting/application/audit/critical_audit_trail'
import { type AccountingAccessContext } from '#core/accounting/application/support/access_context'
import { DEFAULT_LIST_PER_PAGE } from '#core/accounting/application/support/pagination'

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

import { confirmExpenseUseCase } from './application/confirm_expense.js'
import { createExpenseUseCase } from './application/create_expense.js'
import { deleteExpenseUseCase } from './application/delete_expense.js'
import { getExpenseSummaryUseCase } from './application/get_expense_summary.js'
import { listExpensesUseCase } from './application/list_expenses.js'
import { createDrizzleExpenseStore } from './drizzle_expense_store.js'

export class ExpenseService {
  private readonly activitySink?: AccountingActivitySink
  private readonly auditTrail: CriticalAuditTrail

  constructor(
    private readonly db: PostgresJsDatabase<any>,
    dependencies: AccountingServiceDependencies = {}
  ) {
    this.activitySink = dependencies.activitySink
    this.auditTrail = dependencies.auditTrail ?? new DatabaseCriticalAuditTrail()
  }

  async confirmExpense(
    id: string,
    access: AccountingAccessContext,
    hooks?: ExpenseConcurrencyHooks
  ): Promise<ExpenseDto> {
    return this.db.transaction((tx) =>
      confirmExpenseUseCase(
        {
          activitySink: this.activitySink,
          auditExecutor: tx,
          auditTrail: this.auditTrail,
          store: createDrizzleExpenseStore(tx),
        },
        id,
        access,
        hooks
      )
    )
  }

  async createExpense(
    input: CreateExpenseInput,
    access: AccountingAccessContext
  ): Promise<ExpenseDto> {
    return this.db.transaction((tx) =>
      createExpenseUseCase(
        {
          activitySink: this.activitySink,
          auditExecutor: tx,
          auditTrail: this.auditTrail,
          store: createDrizzleExpenseStore(tx),
        },
        input,
        access
      )
    )
  }

  async deleteExpense(
    id: string,
    access: AccountingAccessContext,
    hooks?: ExpenseConcurrencyHooks
  ): Promise<void> {
    await this.db.transaction((tx) =>
      deleteExpenseUseCase(
        {
          activitySink: this.activitySink,
          auditExecutor: tx,
          auditTrail: this.auditTrail,
          store: createDrizzleExpenseStore(tx),
        },
        id,
        access,
        hooks
      )
    )
  }

  async getSummary(
    access: AccountingAccessContext,
    dateFilter?: DateFilter
  ): Promise<ExpenseSummary> {
    return getExpenseSummaryUseCase(createDrizzleExpenseStore(this.db), access, dateFilter)
  }

  async listExpenses(
    page = 1,
    perPage = DEFAULT_LIST_PER_PAGE,
    access: AccountingAccessContext,
    dateFilter?: DateFilter,
    search?: string
  ): Promise<ExpenseListResult> {
    return listExpensesUseCase(
      createDrizzleExpenseStore(this.db),
      page,
      perPage,
      access,
      dateFilter,
      search
    )
  }
}
