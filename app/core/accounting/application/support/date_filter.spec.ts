import { expenses, invoices } from '#core/accounting/drizzle/schema'
import { test } from '@japa/runner'

import { buildDateFilterCondition } from './date_filter.js'

test.group('date filter helper', () => {
  test('returns undefined when no filter is provided', ({ assert }) => {
    assert.isUndefined(buildDateFilterCondition(invoices.issueDate, undefined))
  })

  test('builds a condition for invoice and expense date columns', ({ assert }) => {
    const invoiceCondition = buildDateFilterCondition(invoices.issueDate, {
      endDate: '2026-04-30',
      startDate: '2026-04-01',
    })
    const expenseCondition = buildDateFilterCondition(expenses.date, {
      endDate: '2026-04-30',
      startDate: '2026-04-01',
    })

    assert.exists(invoiceCondition)
    assert.exists(expenseCondition)
  })
})
