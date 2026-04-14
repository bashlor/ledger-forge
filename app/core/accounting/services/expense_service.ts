import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { expenses, journalEntries } from '#core/accounting/drizzle/schema'
import { DomainError } from '#core/shared/domain_error'
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

export class ExpenseService {
  constructor(private readonly db: PostgresJsDatabase<any>) {}

  async confirmExpense(id: string): Promise<ExpenseDto> {
    return this.db.transaction(async (tx) => {
      const [existing] = await tx.select().from(expenses).where(eq(expenses.id, id))
      if (!existing) {
        throw new DomainError('Expense not found.', 'not_found')
      }
      if (existing.status !== 'draft') {
        throw new DomainError('Only draft expenses can be confirmed.', 'business_logic_error')
      }

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
    const amountCents = Math.round(input.amount * 100)

    const [row] = await this.db
      .insert(expenses)
      .values({
        amountCents,
        category: input.category,
        date: input.date,
        id: uuidv7(),
        label: input.label,
        status: 'draft',
      })
      .returning()

    return toExpenseDto(row)
  }

  async deleteExpense(id: string): Promise<void> {
    return this.db.transaction(async (tx) => {
      const [existing] = await tx.select().from(expenses).where(eq(expenses.id, id))
      if (!existing) {
        throw new DomainError('Expense not found.', 'not_found')
      }
      if (existing.status !== 'draft') {
        throw new DomainError('Only draft expenses can be deleted.', 'business_logic_error')
      }

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
    const where = dateCondition(dateFilter)

    const [{ totalCount }] = await this.db
      .select({ totalCount: count() })
      .from(expenses)
      .where(where)

    const totalPages = Math.max(1, Math.ceil(totalCount / perPage))
    const safePage = Math.min(Math.max(page, 1), totalPages)
    const offset = (safePage - 1) * perPage

    const rows = await this.db
      .select()
      .from(expenses)
      .where(where)
      .orderBy(desc(expenses.date), expenses.label)
      .limit(perPage)
      .offset(offset)

    return {
      items: rows.map(toExpenseDto),
      pagination: {
        page: safePage,
        perPage,
        totalItems: totalCount,
        totalPages,
      },
    }
  }
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
