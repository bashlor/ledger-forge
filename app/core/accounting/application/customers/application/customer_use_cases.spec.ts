import { type DomainError } from '#core/common/errors/domain_error'
import { test } from '@japa/runner'

import type { CustomerStore } from './support/customer_store.js'

import { createCustomerUseCase } from './create_customer.js'
import { deleteCustomerUseCase } from './delete_customer.js'
import { listCustomersPageUseCase } from './list_customers_page.js'
import { updateCustomerUseCase } from './update_customer.js'

const ACCESS = {
  actorId: 'actor-1',
  isAnonymous: false,
  requestId: 'req-1',
  tenantId: 'tenant-1',
} as const

function makeCustomerRow(overrides: Record<string, unknown> = {}) {
  return {
    address: '1 rue Demo',
    company: 'Demo Co',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    createdBy: 'actor-1',
    email: 'demo@example.com',
    id: 'customer-1',
    name: 'Demo User',
    note: 'Initial note',
    organizationId: 'tenant-1',
    phone: '+33 6 00 00 00 00',
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

function makeStore(overrides: Partial<CustomerStore> = {}): CustomerStore {
  return {
    async customerStateForDelete() {
      return undefined
    },
    async deleteIfUnlinked() {
      return { id: 'customer-1' }
    },
    async findById() {
      return makeCustomerRow()
    },
    async insert() {
      return makeCustomerRow()
    },
    async invoiceAggregateForCustomer() {
      return { invoiceCount: 0, totalInvoicedCents: 0 }
    },
    async listWithAggregates() {
      return {
        aggregatesByCustomerId: new Map(),
        linkedCustomers: 0,
        pagination: { page: 1, perPage: 10, totalItems: 0, totalPages: 1 },
        rows: [],
        totalInvoicedCents: 0,
      }
    },
    async syncDraftInvoiceSnapshots() {},
    async updateById() {
      return makeCustomerRow()
    },
    ...overrides,
  }
}

test.group('customer use cases', () => {
  test('create use case normalizes input and records side effects', async ({ assert }) => {
    const calls: string[] = []
    const store = makeStore({
      async insert(input) {
        calls.push(`insert:${input.company}:${input.email}:${input.phone}`)
        return makeCustomerRow({
          company: input.company,
          email: input.email,
          phone: input.phone,
        })
      },
    })

    const result = await createCustomerUseCase(
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
        address: ' 1 rue Demo ',
        company: ' Demo Co ',
        email: ' demo@example.com ',
        name: ' Demo User ',
        phone: '   ',
      },
      ACCESS
    )

    assert.equal(result.company, 'Demo Co')
    assert.equal(result.email, 'demo@example.com')
    assert.equal(result.phone, '')
    assert.deepEqual(calls, [
      'insert:Demo Co:demo@example.com:',
      'audit:create:customer-1',
      'activity:create_customer:customer-1',
    ])
  })

  test('update use case skips draft snapshot sync when only note changes', async ({ assert }) => {
    const calls: string[] = []

    await updateCustomerUseCase(
      {
        activitySink: {
          record(event) {
            calls.push(`activity:${event.operation}`)
          },
        },
        auditExecutor: {} as never,
        auditTrail: {
          async record(_, input) {
            calls.push(`audit:${input.action}`)
          },
        },
        store: makeStore({
          async invoiceAggregateForCustomer() {
            return { invoiceCount: 2, totalInvoicedCents: 12345 }
          },
          async syncDraftInvoiceSnapshots() {
            calls.push('sync')
          },
          async updateById(_, input) {
            return makeCustomerRow({ note: input.note })
          },
        }),
      },
      'customer-1',
      {
        address: '1 rue Demo',
        company: 'Demo Co',
        email: 'demo@example.com',
        name: 'Demo User',
        note: 'Updated note only',
        phone: '+33 6 00 00 00 00',
      },
      ACCESS
    )

    assert.notInclude(calls, 'sync')
    assert.deepEqual(calls, ['audit:update', 'activity:update_customer'])
  })

  test('delete use case maps linked customer state to a business logic error', async ({
    assert,
  }) => {
    let error: DomainError | undefined

    try {
      await deleteCustomerUseCase(
        {
          activitySink: undefined,
          auditExecutor: {} as never,
          auditTrail: { async record() {} },
          store: makeStore({
            async customerStateForDelete() {
              return { id: 'customer-1', invoiceCount: 2 }
            },
            async deleteIfUnlinked() {
              return undefined
            },
          }),
        },
        'customer-1',
        ACCESS
      )
    } catch (caught) {
      error = caught as DomainError
    }

    if (!error) {
      throw new Error('Expected deleteCustomerUseCase to throw a DomainError')
    }

    assert.equal(error.type, 'business_logic_error')
    assert.equal(error.message, 'This customer is referenced by one or more invoices.')
  })

  test('list use case clamps inputs and shapes rows into customer DTOs', async ({ assert }) => {
    const result = await listCustomersPageUseCase(
      makeStore({
        async listWithAggregates(page, perPage, tenantId, search) {
          assert.equal(page, 1)
          assert.equal(perPage, 1)
          assert.equal(tenantId, ACCESS.tenantId)
          assert.equal(search, 'cursor')
          return {
            aggregatesByCustomerId: new Map([
              ['customer-1', { invoiceCount: 1, totalInvoicedCents: 12345 }],
            ]),
            linkedCustomers: 1,
            pagination: { page: 1, perPage: 1, totalItems: 1, totalPages: 1 },
            rows: [makeCustomerRow()],
            totalInvoicedCents: 12345,
          }
        },
      }),
      -10,
      0,
      ACCESS,
      '  cursor  '
    )

    assert.equal(result.pagination.page, 1)
    assert.equal(result.pagination.perPage, 1)
    assert.equal(result.items.length, 1)
    assert.equal(result.items[0].invoiceCount, 1)
    assert.equal(result.summary.totalCount, 1)
    assert.equal(result.summary.linkedCustomers, 1)
  })
})
