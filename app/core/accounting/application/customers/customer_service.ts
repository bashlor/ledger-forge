import type { AccountingActivitySink } from '#core/accounting/application/support/activity_log'
import type { AccountingServiceDependencies } from '#core/accounting/application/support/service_dependencies'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import {
  type CriticalAuditTrail,
  DatabaseCriticalAuditTrail,
} from '#core/accounting/application/audit/critical_audit_trail'
import { type AccountingAccessContext } from '#core/accounting/application/support/access_context'
import { DEFAULT_LIST_PER_PAGE } from '#core/accounting/application/support/pagination'

import type { CreateCustomerInput, CustomerDto, CustomerListResult } from './types.js'

import { createCustomerUseCase } from './application/create_customer.js'
import { deleteCustomerUseCase } from './application/delete_customer.js'
import { listCustomersPageUseCase } from './application/list_customers_page.js'
import { updateCustomerUseCase } from './application/update_customer.js'
import { createDrizzleCustomerStore } from './drizzle_customer_store.js'

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
    return this.db.transaction((tx) =>
      createCustomerUseCase(
        {
          activitySink: this.activitySink,
          auditExecutor: tx,
          auditTrail: this.auditTrail,
          store: createDrizzleCustomerStore(tx),
        },
        input,
        access
      )
    )
  }

  async deleteCustomer(id: string, access: AccountingAccessContext): Promise<void> {
    await this.db.transaction((tx) =>
      deleteCustomerUseCase(
        {
          activitySink: this.activitySink,
          auditExecutor: tx,
          auditTrail: this.auditTrail,
          store: createDrizzleCustomerStore(tx),
        },
        id,
        access
      )
    )
  }

  async listCustomersPage(
    page = 1,
    perPage = DEFAULT_LIST_PER_PAGE,
    access: AccountingAccessContext,
    search?: string
  ): Promise<CustomerListResult> {
    return listCustomersPageUseCase(
      createDrizzleCustomerStore(this.db),
      page,
      perPage,
      access,
      search
    )
  }

  async updateCustomer(
    id: string,
    input: CreateCustomerInput,
    access: AccountingAccessContext
  ): Promise<CustomerDto> {
    return this.db.transaction((tx) =>
      updateCustomerUseCase(
        {
          activitySink: this.activitySink,
          auditExecutor: tx,
          auditTrail: this.auditTrail,
          store: createDrizzleCustomerStore(tx),
        },
        id,
        input,
        access
      )
    )
  }
}
