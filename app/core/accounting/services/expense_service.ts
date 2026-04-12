import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { expenses } from '#core/accounting/drizzle/schema'
import { DomainError } from '#core/shared/domain_error'
import { and, count, desc, eq, sql, sum } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'

export interface CreateExpenseInput {
  amount: number
  category: string
  date: string
  label: string
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
  summary: {
    confirmedCount: number
    draftCount: number
    totalAmount: number
    totalCount: number
  }
}

type ExpenseRow = typeof expenses.$inferSelect

export class ExpenseService {
  constructor(private readonly db: PostgresJsDatabase<any>) {}

  async confirmExpense(id: string): Promise<ExpenseDto> {
    const [updated] = await this.db
      .update(expenses)
      .set({ status: 'confirmed' })
      .where(and(eq(expenses.id, id), eq(expenses.status, 'draft')))
      .returning()

    if (!updated) {
      throw await this.notDraftError(id, 'confirmed')
    }

    return toExpenseDto(updated)
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
    const [deleted] = await this.db
      .delete(expenses)
      .where(and(eq(expenses.id, id), eq(expenses.status, 'draft')))
      .returning({ id: expenses.id })

    if (!deleted) {
      throw await this.notDraftError(id, 'deleted')
    }
  }

  async listExpenses(page = 1, perPage = 5): Promise<ExpenseListResult> {
    const [summary] = await this.db
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

    const { confirmedCount, draftCount, totalAmountCents, totalCount } = summary
    const totalPages = Math.max(1, Math.ceil(totalCount / perPage))
    const safePage = Math.min(Math.max(page, 1), totalPages)
    const offset = (safePage - 1) * perPage

    const rows = await this.db
      .select()
      .from(expenses)
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
      summary: {
        confirmedCount,
        draftCount,
        totalAmount: Number(totalAmountCents ?? 0) / 100,
        totalCount,
      },
    }
  }

  private async notDraftError(id: string, action: string): Promise<DomainError> {
    const [existing] = await this.db
      .select({ id: expenses.id })
      .from(expenses)
      .where(eq(expenses.id, id))

    return new DomainError(
      existing ? `Only draft expenses can be ${action}.` : 'Expense not found.',
      existing ? 'business_logic_error' : 'not_found'
    )
  }
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
