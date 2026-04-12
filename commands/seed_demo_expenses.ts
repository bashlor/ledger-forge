import type { CommandOptions } from '@adonisjs/core/types/ace'

import { expenses } from '#core/accounting/drizzle/schema'
import { ExpenseService } from '#core/accounting/services/expense_service'
import { BaseCommand, flags } from '@adonisjs/core/ace'
import { count } from 'drizzle-orm'

interface ExpenseSeed {
  amount: number
  category: string
  confirmed: boolean
  date: string
  label: string
}

const DEMO_EXPENSES: readonly ExpenseSeed[] = [
  { amount: 18, category: 'Software', confirmed: true, date: '2026-04-02', label: 'Figma' },
  { amount: 220, category: 'Office', confirmed: false, date: '2026-04-01', label: 'Coworking' },
  {
    amount: 146,
    category: 'Infrastructure',
    confirmed: true,
    date: '2026-03-29',
    label: 'Amazon Web Services',
  },
  {
    amount: 85,
    category: 'Infrastructure',
    confirmed: true,
    date: '2026-03-15',
    label: 'Error monitoring plan',
  },
  {
    amount: 310,
    category: 'Services',
    confirmed: false,
    date: '2026-03-18',
    label: 'Contractor design support',
  },
  {
    amount: 235,
    category: 'Travel',
    confirmed: true,
    date: '2026-03-14',
    label: 'Client workshop train',
  },
  {
    amount: 29,
    category: 'Software',
    confirmed: true,
    date: '2026-03-02',
    label: 'Calendar scheduling',
  },
  {
    amount: 74,
    category: 'Office',
    confirmed: false,
    date: '2026-02-16',
    label: 'Coworking day passes',
  },
]

export default class SeedDemoExpenses extends BaseCommand {
  static commandName = 'expenses:seed-demo'
  static description = 'Seed demo expense data for development'

  static options: CommandOptions = {
    startApp: true,
  }

  @flags.boolean({
    description: 'Delete existing expenses before seeding',
  })
  declare reset: boolean

  async run() {
    const db = await this.app.container.make('drizzle')

    if (this.reset) {
      await db.delete(expenses)
      this.logger.info('Deleted existing expenses.')
    } else {
      const [existing] = await db.select({ value: count() }).from(expenses)

      if ((existing?.value ?? 0) > 0) {
        this.exitCode = 1
        this.logger.error('Expenses already exist. Re-run with --reset to replace them.')
        return
      }
    }

    const expenseService = await this.app.container.make(ExpenseService)
    let confirmedCount = 0

    for (const seed of DEMO_EXPENSES) {
      const created = await expenseService.createExpense({
        amount: seed.amount,
        category: seed.category,
        date: seed.date,
        label: seed.label,
      })

      if (seed.confirmed) {
        await expenseService.confirmExpense(created.id)
        confirmedCount++
      }
    }

    this.logger.success(
      `Seeded ${DEMO_EXPENSES.length} expenses (${confirmedCount} confirmed, ${DEMO_EXPENSES.length - confirmedCount} drafts).`
    )
  }
}
