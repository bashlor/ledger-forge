import { DomainError } from '#core/common/errors/domain_error'

import type { CreateCustomerInput, NormalizedCustomerInput } from './types.js'

export function normalizeCustomerInput(input: CreateCustomerInput): NormalizedCustomerInput {
  const address = input.address.trim()
  const company = input.company.trim()
  const email = input.email?.trim() || ''
  const name = input.name.trim()
  const note = input.note?.trim() || undefined
  const phone = input.phone?.trim() || ''

  if (!address) {
    throw new DomainError('Customer address is required.', 'invalid_data')
  }

  if (!company) {
    throw new DomainError('Customer company is required.', 'invalid_data')
  }

  if (!name) {
    throw new DomainError('Customer contact name is required.', 'invalid_data')
  }

  if (!email && !phone) {
    throw new DomainError('Provide at least an email or a phone number.', 'invalid_data')
  }

  return {
    address,
    company,
    email,
    name,
    note,
    phone,
  }
}
