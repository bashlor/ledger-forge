import { DomainError } from '#core/common/errors/domain_error'
import { test } from '@japa/runner'

import {
  assertDraftCanBeCanceled,
  assertDraftCanBeCreatedToday,
  assertDraftCanBeUpdated,
  assertInvoiceBelongsToTenant,
  assertInvoiceCanBeIssuedToday,
  assertInvoiceCanBeMarkedPaid,
  assertInvoiceCanBeMarkedPaidNow,
  assertInvoiceCanBeSent,
  assertInvoiceIsDraft,
} from './invoice_rules.js'
import { canTransitionInvoiceStatus } from './invoice_status.js'

test.group('invoice domain rules', () => {
  test('enforces tenant mismatch guard for invoice access', ({ assert }) => {
    assert.doesNotThrow(() => assertInvoiceBelongsToTenant('tenant-a', 'tenant-a'))
    assert.throws(() => assertInvoiceBelongsToTenant(undefined, 'tenant-a'), DomainError)
    assert.throws(() => assertInvoiceBelongsToTenant(null, 'tenant-a'), DomainError)
    assert.throws(() => assertInvoiceBelongsToTenant('tenant-a', 'tenant-b'), DomainError)
  })

  test('enforces lifecycle transition guards', ({ assert }) => {
    assert.throws(() => assertInvoiceCanBeSent('issued'), DomainError)
    assert.throws(() => assertInvoiceCanBeMarkedPaid('draft'), DomainError)
    assert.throws(() => assertInvoiceIsDraft('paid'), DomainError)
    assert.throws(() => assertDraftCanBeCanceled('paid'), DomainError)
    assert.throws(() => assertInvoiceCanBeMarkedPaidNow('draft'), DomainError)
    assert.throws(
      () => assertInvoiceCanBeIssuedToday('issued', '2026-04-10', '2026-04-01'),
      DomainError
    )
    assert.throws(
      () =>
        assertDraftCanBeUpdated({
          createdAt: '2026-04-10',
          dueDate: '2026-04-09',
          issueDate: '2026-04-10',
          status: 'draft',
        }),
      DomainError
    )
    assert.throws(
      () => assertDraftCanBeCreatedToday('2026-04-10', '2026-04-09', '2026-04-10'),
      DomainError
    )

    assert.doesNotThrow(() => assertInvoiceCanBeSent('draft'))
    assert.doesNotThrow(() => assertInvoiceCanBeMarkedPaid('issued'))
    assert.doesNotThrow(() => assertInvoiceIsDraft('draft'))
    assert.doesNotThrow(() => assertDraftCanBeCanceled('draft'))
    assert.doesNotThrow(() => assertInvoiceCanBeMarkedPaidNow('issued'))
    assert.doesNotThrow(() => assertInvoiceCanBeIssuedToday('draft', '2026-04-10', '2026-04-01'))
    assert.doesNotThrow(() =>
      assertDraftCanBeUpdated({
        createdAt: '2026-04-01',
        dueDate: '2026-04-10',
        issueDate: '2026-04-01',
        status: 'draft',
      })
    )
    assert.doesNotThrow(() =>
      assertDraftCanBeCreatedToday('2026-04-01', '2026-04-10', '2026-04-01')
    )
  })

  test('exposes status transition helper', ({ assert }) => {
    assert.isTrue(canTransitionInvoiceStatus('draft', 'issued'))
    assert.isTrue(canTransitionInvoiceStatus('issued', 'paid'))
    assert.isFalse(canTransitionInvoiceStatus('draft', 'paid'))
    assert.isFalse(canTransitionInvoiceStatus('paid', 'draft'))
  })
})
