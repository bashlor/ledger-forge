import { type DomainError } from '#core/common/errors/domain_error'
import { test } from '@japa/runner'

import type { ExpenseStore } from './support/expense_store.js'

import { confirmExpenseUseCase } from './confirm_expense.js'
import { createExpenseUseCase } from './create_expense.js'
import { deleteExpenseUseCase } from './delete_expense.js'
import { listExpensesUseCase } from './list_expenses.js'

const ACCESS = {
  actorId: 'actor-1',
  isAnonymous: false,
  requestId: 'req-1',
  tenantId: 'tenant-1',
} as const

function makeExpenseRow(overrides: Record<string, unknown> = {}) {
  return {
    amountCents: 1234,
    category: 'Software',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    createdBy: 'actor-1' as null | string,
    date: '2026-04-01',
    id: 'expense-1',
    label: 'Expense demo',
    organizationId: 'tenant-1',
    status: 'draft' as const,
    ...overrides,
  }
}

function makeStore(overrides: Partial<ExpenseStore> = {}): ExpenseStore {
  return {
    async confirmDraft() {
      return makeExpenseRow({ status: 'confirmed' })
    },
    async deleteDraft() {
      return { id: 'expense-1' }
    },
    async findById() {
      return makeExpenseRow()
    },
    async getSummary() {
      return { confirmedCount: 0, draftCount: 0, totalAmount: 0, totalCount: 0 }
    },
    async insertDraft(input, _actor) {
      return makeExpenseRow({
        amountCents: input.amountCents,
        category: input.category,
        date: input.date,
        label: input.label,
      })
    },
    async insertJournalEntry() {},
    async list() {
      return {
        pagination: { page: 1, perPage: 10, totalItems: 0, totalPages: 1 },
        rows: [],
      }
    },
    ...overrides,
  }
}

test.group('expense use cases', () => {
  test('create use case normalizes input and records side effects', async ({ assert }) => {
    const calls: string[] = []
    const store = makeStore({
      async insertDraft(input, _actor) {
        calls.push(`insert:${input.label}:${input.date}:${input.amountCents}`)
        return makeExpenseRow({
          amountCents: input.amountCents,
          category: input.category,
          date: input.date,
          label: input.label,
        })
      },
    })

    const result = await createExpenseUseCase(
      {
        activitySink: {
          record(event) {
            calls.push(`activity:${event.operation}:${event.resourceId}`)
          },
        },
        auditExecutor: {} as never,
        auditTrail: {
          async record(_, input) {
            calls.push(`audit:${input.action}:${input.entityId}`)
          },
        },
        store,
      },
      {
        amount: 12.345,
        category: 'Software',
        date: '2026-04-01',
        label: ' Cursor ',
      },
      ACCESS
    )

    assert.equal(result.amount, 12.35)
    assert.equal(result.label, 'Cursor')
    assert.deepEqual(calls, [
      'insert:Cursor:2026-04-01:1235',
      'audit:create:expense-1',
      'activity:create_expense:expense-1',
    ])
  })

  test('confirm use case maps a second confirm to a business logic error', async ({ assert }) => {
    let error: DomainError | undefined

    try {
      await confirmExpenseUseCase(
        {
          activitySink: undefined,
          auditExecutor: {} as never,
          auditTrail: { async record() {} },
          store: makeStore({
            async confirmDraft() {
              return undefined
            },
            async findById(_id, _tenantId) {
              return makeExpenseRow({ status: 'confirmed' })
            },
          }),
        },
        'expense-1',
        ACCESS
      )
    } catch (caught) {
      error = caught as DomainError
    }

    if (!error) {
      throw new Error('Expected confirmExpenseUseCase to throw a DomainError')
    }

    assert.equal(error.type, 'business_logic_error')
    assert.equal(error.message, 'Only draft expenses can be confirmed.')
  })

  test('delete use case maps missing state to not_found', async ({ assert }) => {
    let error: DomainError | undefined

    try {
      await deleteExpenseUseCase(
        {
          activitySink: undefined,
          auditExecutor: {} as never,
          auditTrail: { async record() {} },
          store: makeStore({
            async deleteDraft() {
              return undefined
            },
            async findById() {
              return undefined
            },
          }),
        },
        'expense-1',
        ACCESS
      )
    } catch (caught) {
      error = caught as DomainError
    }

    if (!error) {
      throw new Error('Expected deleteExpenseUseCase to throw a DomainError')
    }

    assert.equal(error.type, 'not_found')
    assert.equal(error.message, 'Expense not found.')
  })

  test('list use case clamps inputs and trims search before querying', async ({ assert }) => {
    const result = await listExpensesUseCase(
      makeStore({
        async list(page, perPage, tenantId, _filter, search) {
          assert.equal(page, 1)
          assert.equal(perPage, 1)
          assert.equal(tenantId, ACCESS.tenantId)
          assert.equal(search, 'cursor')
          return {
            pagination: { page: 1, perPage: 1, totalItems: 1, totalPages: 1 },
            rows: [makeExpenseRow()],
          }
        },
      }),
      -10,
      0,
      ACCESS,
      undefined,
      '  cursor  '
    )

    assert.equal(result.pagination.page, 1)
    assert.equal(result.pagination.perPage, 1)
    assert.equal(result.items.length, 1)
    assert.equal(result.items[0].id, 'expense-1')
  })
})
