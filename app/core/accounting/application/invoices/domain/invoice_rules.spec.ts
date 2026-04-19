import { DomainError } from '#core/common/errors/domain_error'
import { test } from '@japa/runner'

import {
  assertInvoiceBelongsToTenant,
  assertInvoiceCanBeMarkedPaid,
  assertInvoiceCanBeSent,
  assertInvoiceIsDraft,
} from './invoice_rules.js'
import { canTransitionInvoiceStatus } from './invoice_status.js'

test.group('invoice domain rules', () => {
  test('enforces tenant mismatch guard for invoice access', ({ assert }) => {
    assert.doesNotThrow(() => assertInvoiceBelongsToTenant('tenant-a', undefined))
    assert.doesNotThrow(() => assertInvoiceBelongsToTenant('tenant-a', 'tenant-a'))
    assert.throws(() => assertInvoiceBelongsToTenant(undefined, 'tenant-a'), DomainError)
    assert.throws(() => assertInvoiceBelongsToTenant(null, 'tenant-a'), DomainError)
    assert.throws(() => assertInvoiceBelongsToTenant('tenant-a', 'tenant-b'), DomainError)
  })

  test('enforces lifecycle transition guards', ({ assert }) => {
    assert.throws(() => assertInvoiceCanBeSent('issued'), DomainError)
    assert.throws(() => assertInvoiceCanBeMarkedPaid('draft'), DomainError)
    assert.throws(() => assertInvoiceIsDraft('paid'), DomainError)

    assert.doesNotThrow(() => assertInvoiceCanBeSent('draft'))
    assert.doesNotThrow(() => assertInvoiceCanBeMarkedPaid('issued'))
    assert.doesNotThrow(() => assertInvoiceIsDraft('draft'))
  })

  test('exposes status transition helper', ({ assert }) => {
    assert.isTrue(canTransitionInvoiceStatus('draft', 'issued'))
    assert.isTrue(canTransitionInvoiceStatus('issued', 'paid'))
    assert.isFalse(canTransitionInvoiceStatus('draft', 'paid'))
    assert.isFalse(canTransitionInvoiceStatus('paid', 'draft'))
  })
})
