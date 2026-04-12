import type { CreateCustomerRequest } from '#core/accounting/services/mock_accounting_store'

import { accountingStore } from '#core/accounting/services/mock_accounting_store'
import { DomainError } from '#core/shared/domain_error'

export class CustomerService {
  async createCustomer(input: CreateCustomerRequest) {
    return accountingStore.createCustomer(input)
  }

  async deleteCustomer(id: string) {
    try {
      accountingStore.deleteCustomer(id)
    } catch (error) {
      throw toDomainError(error)
    }
  }

  async listCustomersPage(page: number, perPage: number) {
    return accountingStore.listCustomersPage(page, perPage)
  }

  async updateCustomer(id: string, input: CreateCustomerRequest) {
    try {
      return accountingStore.updateCustomer(id, input)
    } catch (error) {
      throw toDomainError(error)
    }
  }
}

function toDomainError(error: unknown): DomainError | unknown {
  if (!(error instanceof Error)) return error

  if (error.name === 'CustomerInvoicesConflictError') {
    return new DomainError(error.message, 'business_logic_error')
  }

  if (error.message.includes('not found')) {
    return new DomainError(error.message, 'not_found')
  }

  return error
}
