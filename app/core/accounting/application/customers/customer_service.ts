import type { AccountingActivitySink } from '#core/accounting/application/support/activity_log'
import type { AccountingServiceDependencies } from '#core/accounting/application/support/service_dependencies'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import {
  type AccountingAccessContext,
  SYSTEM_ACCOUNTING_ACCESS_CONTEXT,
} from '#core/accounting/application/support/access_context'
import { clampInteger } from '#core/accounting/application/support/pagination'
import { DomainError } from '#core/common/errors/domain_error'

import type { CreateCustomerInput, CustomerDto, CustomerListResult } from './types.js'

import {
  deleteCustomerIfUnlinked,
  insertCustomer,
  syncDraftInvoiceCustomerSnapshots,
  updateCustomerById,
} from './commands.js'
import { toCustomerDto } from './mappers.js'
import {
  customerStateForDelete,
  findCustomerById,
  invoiceAggregateForCustomer,
  listCustomersWithAggregates,
} from './queries.js'
import { MAX_PER_PAGE, MIN_PER_PAGE } from './types.js'
import { normalizeCustomerInput } from './validation.js'

export class CustomerService {
  private readonly activitySink?: AccountingActivitySink

  constructor(
    private readonly db: PostgresJsDatabase<any>,
    dependencies: AccountingServiceDependencies = {}
  ) {
    this.activitySink = dependencies.activitySink
  }

  async createCustomer(
    input: CreateCustomerInput,
    access: AccountingAccessContext = SYSTEM_ACCOUNTING_ACCESS_CONTEXT
  ): Promise<CustomerDto> {
    const normalized = normalizeCustomerInput(input)
    const row = await insertCustomer(this.db, normalized)

    await this.activitySink?.record({
      actorId: access.actorId,
      boundedContext: 'accounting',
      isAnonymous: access.isAnonymous,
      operation: 'create_customer',
      outcome: 'success',
      resourceId: row.id,
      resourceType: 'customer',
    })

    return toCustomerDto(row, { invoiceCount: 0, totalInvoicedCents: 0 })
  }

  async deleteCustomer(
    id: string,
    access: AccountingAccessContext = SYSTEM_ACCOUNTING_ACCESS_CONTEXT
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      const deleted = await deleteCustomerIfUnlinked(tx, id)

      if (!deleted) {
        const state = await customerStateForDelete(tx, id)

        if (!state) {
          throw new DomainError('Customer not found.', 'not_found')
        }

        if (state.invoiceCount > 0) {
          throw new DomainError(
            'This customer is referenced by one or more invoices.',
            'business_logic_error'
          )
        }

        throw new DomainError('Customer not found.', 'not_found')
      }

      await this.activitySink?.record({
        actorId: access.actorId,
        boundedContext: 'accounting',
        isAnonymous: access.isAnonymous,
        operation: 'delete_customer',
        outcome: 'success',
        resourceId: id,
        resourceType: 'customer',
      })
    })
  }

  async listCustomersPage(
    page = 1,
    perPage = 5,
    _access: AccountingAccessContext = SYSTEM_ACCOUNTING_ACCESS_CONTEXT
  ): Promise<CustomerListResult> {
    const safePerPage = clampInteger(perPage, MIN_PER_PAGE, MAX_PER_PAGE)
    const requestedPage = clampInteger(page, 1, Number.MAX_SAFE_INTEGER)
    const { aggregatesByCustomerId, linkedCustomers, pagination, rows, totalInvoicedCents } =
      await listCustomersWithAggregates(this.db, requestedPage, safePerPage)

    if (rows.length === 0) {
      return {
        items: [],
        pagination,
        summary: {
          linkedCustomers,
          totalCount: pagination.totalItems,
          totalInvoiced: Number(totalInvoicedCents ?? 0) / 100,
        },
      }
    }

    const items = rows.map((row) => {
      const agg = aggregatesByCustomerId.get(row.id) ?? { invoiceCount: 0, totalInvoicedCents: 0 }
      return toCustomerDto(row, agg)
    })

    return {
      items,
      pagination,
      summary: {
        linkedCustomers,
        totalCount: pagination.totalItems,
        totalInvoiced: Number(totalInvoicedCents ?? 0) / 100,
      },
    }
  }

  async updateCustomer(
    id: string,
    input: CreateCustomerInput,
    access: AccountingAccessContext = SYSTEM_ACCOUNTING_ACCESS_CONTEXT
  ): Promise<CustomerDto> {
    const existing = await findCustomerById(this.db, id)

    if (!existing) {
      throw new DomainError('Customer not found.', 'not_found')
    }

    const normalized = normalizeCustomerInput(input)
    const snapshotChanged =
      existing.address !== normalized.address ||
      existing.company !== normalized.company ||
      existing.email !== normalized.email ||
      existing.name !== normalized.name ||
      existing.phone !== normalized.phone

    const updatedRow = await this.db.transaction(async (tx) => {
      const updated = await updateCustomerById(tx, id, normalized)

      if (!updated) {
        throw new DomainError('Customer not found.', 'not_found')
      }

      if (snapshotChanged) {
        await syncDraftInvoiceCustomerSnapshots(tx, id, normalized)
      }

      return updated
    })

    await this.activitySink?.record({
      actorId: access.actorId,
      boundedContext: 'accounting',
      isAnonymous: access.isAnonymous,
      operation: 'update_customer',
      outcome: 'success',
      resourceId: id,
      resourceType: 'customer',
    })

    const agg = await invoiceAggregateForCustomer(this.db, id)
    return toCustomerDto(updatedRow, agg)
  }
}
