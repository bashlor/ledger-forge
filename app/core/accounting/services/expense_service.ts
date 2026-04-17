import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { expenses, journalEntries } from '#core/accounting/drizzle/schema'
import { DomainError } from '#core/shared/domain_error'
import { toCents } from '#core/shared/money'
import { and, count, desc, eq, gte, lte, sql, sum } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'

export interface CreateExpenseInput {
  amount: number
  category: string
  date: string
  label: string
}

export interface DateFilter {
  endDate: string
  startDate: string
}

export interface ExpenseConcurrencyHooks {
  afterRead?: () => Promise<void>
}

export interface ExpenseSummary {
  confirmedCount: number
  draftCount: number
  totalAmount: number
  totalCount: number
}

interface ExpenseDto {
  amount: number
  canConfirm: boolean
  canDelete: boolean
  category: string
  date: string
  id: string
  label: string
  status: 'confirmed' | 'draft'
}

interface ExpenseListResult {
  items: ExpenseDto[]
  pagination: {
    page: number
    perPage: number
    totalItems: number
    totalPages: number
  }
}

type ExpenseRow = typeof expenses.$inferSelect

const MAX_PER_PAGE = 100
const MIN_PER_PAGE = 1

export class ExpenseService {
  constructor(private readonly db: PostgresJsDatabase<any>) {}

  async confirmExpense(id: string, hooks?: ExpenseConcurrencyHooks): Promise<ExpenseDto> {
    // Atomicity: the winning workflow updates status and writes journal entry in one transaction.
    return this.db.transaction(async (tx) => {
      // Read is diagnostic only: we only fail fast on true not-found.
      const [existing] = await tx.select().from(expenses).where(eq(expenses.id, id))
      if (!existing) {
        throw new DomainError('Expense not found.', 'not_found')
      }
      await hooks?.afterRead?.()

      // Conditional write arbitrates concurrency and status validity.
      const [updated] = await tx
        .update(expenses)
        .set({ status: 'confirmed' })
        .where(and(eq(expenses.id, id), eq(expenses.status, 'draft')))
        .returning()

      if (!updated) {
        const [again] = await tx.select().from(expenses).where(eq(expenses.id, id))
        if (!again) {
          throw new DomainError('Expense not found.', 'not_found')
        }
        throw new DomainError('Only draft expenses can be confirmed.', 'business_logic_error')
      }

      await tx.insert(journalEntries).values({
        amountCents: updated.amountCents,
        date: updated.date,
        expenseId: updated.id,
        id: uuidv7(),
        label: updated.label,
        type: 'expense',
      })

      return toExpenseDto(updated)
    })
  }

  async createExpense(input: CreateExpenseInput): Promise<ExpenseDto> {
    if (input.amount <= 0) {
      throw new DomainError('Amount must be greater than 0.', 'invalid_data')
    }
    if (input.label.trim().length === 0) {
      throw new DomainError('Label must not be empty.', 'invalid_data')
    }

    const amountCents = toCents(input.amount)

    const [row] = await this.db
      .insert(expenses)
      .values({
        amountCents,
        category: input.category,
        date: input.date,
        id: uuidv7(),
        label: input.label.trim(),
        status: 'draft',
      })
      .returning()

    return toExpenseDto(row)
  }

  async deleteExpense(id: string, hooks?: ExpenseConcurrencyHooks): Promise<void> {
    // Atomicity: the winning delete happens entirely inside one transaction.
    return this.db.transaction(async (tx) => {
      // Read is diagnostic only: we only fail fast on true not-found.
      const [existing] = await tx.select().from(expenses).where(eq(expenses.id, id))
      if (!existing) {
        throw new DomainError('Expense not found.', 'not_found')
      }
      await hooks?.afterRead?.()

      // Conditional delete arbitrates concurrency and status validity.
      const [deleted] = await tx
        .delete(expenses)
        .where(and(eq(expenses.id, id), eq(expenses.status, 'draft')))
        .returning({ id: expenses.id })

      if (!deleted) {
        const [again] = await tx.select().from(expenses).where(eq(expenses.id, id))
        if (!again) {
          throw new DomainError('Expense not found.', 'not_found')
        }
        throw new DomainError('Only draft expenses can be deleted.', 'business_logic_error')
      }
    })
  }

  async getSummary(dateFilter?: DateFilter): Promise<ExpenseSummary> {
    const [row] = await this.db
      .select({
        confirmedCount:
          sql<number>`count(*) filter (where ${expenses.status} = 'confirmed')`.mapWith(Number),
        draftCount: sql<number>`count(*) filter (where ${expenses.status} = 'draft')`.mapWith(
          Number
        ),
        totalAmountCents: sum(
          sql`case when ${expenses.status} = 'confirmed' then ${expenses.amountCents} else 0 end`
        ),
        totalCount: count(),
      })
      .from(expenses)
      .where(dateCondition(dateFilter))

    return {
      confirmedCount: row.confirmedCount,
      draftCount: row.draftCount,
      totalAmount: Number(row.totalAmountCents ?? 0) / 100,
      totalCount: row.totalCount,
    }
  }

  async listExpenses(page = 1, perPage = 5, dateFilter?: DateFilter): Promise<ExpenseListResult> {
    const safePerPage = clampInteger(perPage, MIN_PER_PAGE, MAX_PER_PAGE)
    const requestedPage = clampInteger(page, 1, Number.MAX_SAFE_INTEGER)
    const where = dateCondition(dateFilter)

    // Count first so the page can be clamped before fetching rows.
    // This avoids the window-function edge case where a large offset returns
    // zero rows and totalCount cannot be derived.
    const [countRow] = await this.db.select({ total: count() }).from(expenses).where(where)
    const totalCount = countRow?.total ?? 0
    const totalPages = Math.max(1, Math.ceil(totalCount / safePerPage))
    const safePage = Math.min(requestedPage, totalPages)
    const offset = (safePage - 1) * safePerPage

    const rows = await this.db
      .select({
        amountCents: expenses.amountCents,
        category: expenses.category,
        createdAt: expenses.createdAt,
        date: expenses.date,
        id: expenses.id,
        label: expenses.label,
        status: expenses.status,
      })
      .from(expenses)
      .where(where)
      .orderBy(desc(expenses.date), expenses.label)
      .limit(safePerPage)
      .offset(offset)

    return {
      items: rows.map((row) => toExpenseDto(row as ExpenseRow)),
      pagination: {
        page: safePage,
        perPage: safePerPage,
        totalItems: totalCount,
        totalPages,
      },
    }
  }
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  const normalized = Math.trunc(value)
  return Math.min(Math.max(normalized, min), max)
}

function dateCondition(filter?: DateFilter) {
  if (!filter) return undefined
  return and(gte(expenses.date, filter.startDate), lte(expenses.date, filter.endDate))
}

function toExpenseDto(row: ExpenseRow): ExpenseDto {
  return {
    amount: row.amountCents / 100,
    canConfirm: row.status === 'draft',
    canDelete: row.status === 'draft',
    category: row.category,
    date: row.date,
    id: row.id,
    label: row.label,
    status: row.status,
  }
}
