import type { AccountingActivitySink } from '#core/accounting/application/support/activity_log'
import type { AccountingServiceDependencies } from '#core/accounting/application/support/service_dependencies'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import {
  type CriticalAuditTrail,
  DatabaseCriticalAuditTrail,
} from '#core/accounting/application/audit/critical_audit_trail'
import { type AccountingAccessContext } from '#core/accounting/application/support/access_context'
import {
  clampInteger,
  DEFAULT_LIST_PER_PAGE,
  MAX_LIST_PER_PAGE,
  MIN_LIST_PER_PAGE,
} from '#core/accounting/application/support/pagination'
import { DomainError } from '#core/common/errors/domain_error'
import { fromCents } from '#core/shared/money'

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
import { normalizeCustomerInput } from './validation.js'

export class CustomerService {
  private readonly activitySink?: AccountingActivitySink
  private readonly auditTrail: CriticalAuditTrail

  constructor(
    private readonly db: PostgresJsDatabase<any>,
    dependencies: AccountingServiceDependencies = {}
  ) {
    this.activitySink = dependencies.activitySink
    this.auditTrail = dependencies.auditTrail ?? new DatabaseCriticalAuditTrail()
  }

  async createCustomer(
    input: CreateCustomerInput,
    access: AccountingAccessContext
  ): Promise<CustomerDto> {
    const normalized = normalizeCustomerInput(input)
    const row = await this.db.transaction(async (tx) => {
      const created = await insertCustomer(tx, normalized, {
        createdBy: access.actorId ?? null,
        organizationId: access.tenantId,
      })

      await this.auditTrail.record(tx, {
        action: 'create',
        actorId: access.actorId,
        entityId: created.id,
        entityType: 'customer',
        tenantId: access.tenantId,
      })

      return created
    })

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

  async deleteCustomer(id: string, access: AccountingAccessContext): Promise<void> {
    await this.db.transaction(async (tx) => {
      const deleted = await deleteCustomerIfUnlinked(tx, id, access.tenantId)

      if (!deleted) {
        const state = await customerStateForDelete(tx, id, access.tenantId)

        if (!state) {
          throw new DomainError('Customer not found.', 'not_found')
        }

        if (state.invoiceCount > 0) {
          throw new DomainError(
            'This customer is referenced by one or more invoices.',
            'business_logic_error'
          )
        }
      }

      await this.auditTrail.record(tx, {
        action: 'delete',
        actorId: access.actorId,
        entityId: id,
        entityType: 'customer',
        tenantId: access.tenantId,
      })
    })

    await this.activitySink?.record({
      actorId: access.actorId,
      boundedContext: 'accounting',
      isAnonymous: access.isAnonymous,
      operation: 'delete_customer',
      outcome: 'success',
      resourceId: id,
      resourceType: 'customer',
    })
  }

  async listCustomersPage(
    page = 1,
    perPage = DEFAULT_LIST_PER_PAGE,
    access: AccountingAccessContext,
    search?: string
  ): Promise<CustomerListResult> {
    const safePerPage = clampInteger(perPage, MIN_LIST_PER_PAGE, MAX_LIST_PER_PAGE)
    const requestedPage = clampInteger(page, 1, Number.MAX_SAFE_INTEGER)
    const { aggregatesByCustomerId, linkedCustomers, pagination, rows, totalInvoicedCents } =
      await listCustomersWithAggregates(
        this.db,
        requestedPage,
        safePerPage,
        access.tenantId,
        search
      )

    if (rows.length === 0) {
      return {
        items: [],
        pagination,
        summary: {
          linkedCustomers,
          totalCount: pagination.totalItems,
          totalInvoiced: fromCents(Number(totalInvoicedCents ?? 0)),
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
        totalInvoiced: fromCents(Number(totalInvoicedCents ?? 0)),
      },
    }
  }

  async updateCustomer(
    id: string,
    input: CreateCustomerInput,
    access: AccountingAccessContext
  ): Promise<CustomerDto> {
    const existing = await findCustomerById(this.db, id, access.tenantId)

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
      const updated = await updateCustomerById(tx, id, normalized, access.tenantId)

      if (!updated) {
        throw new DomainError('Customer not found.', 'not_found')
      }

      if (snapshotChanged) {
        // Draft invoices keep following customer edits; issued invoices stay legally frozen.
        await syncDraftInvoiceCustomerSnapshots(tx, id, normalized, access.tenantId)
      }

      await this.auditTrail.record(tx, {
        action: 'update',
        actorId: access.actorId,
        changes: {
          after: {
            address: normalized.address,
            company: normalized.company,
            email: normalized.email,
            name: normalized.name,
            note: normalized.note,
            phone: normalized.phone,
          },
          before: {
            address: existing.address,
            company: existing.company,
            email: existing.email,
            name: existing.name,
            note: existing.note,
            phone: existing.phone,
          },
        },
        entityId: id,
        entityType: 'customer',
        tenantId: access.tenantId,
      })

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

    const agg = await invoiceAggregateForCustomer(this.db, id, access.tenantId)
    return toCustomerDto(updatedRow, agg)
  }
}
