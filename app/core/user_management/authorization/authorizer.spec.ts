import { test } from '@japa/runner'

import { type AuthorizationActor, can, type MembershipAuthorizationSubject } from './authorizer.js'

function actor(overrides: Partial<AuthorizationActor> = {}): AuthorizationActor {
  return {
    activeTenantId: 'tenant_test',
    isDevOperator: false,
    membershipIsActive: true,
    membershipRole: 'member',
    userId: 'user_test',
    ...overrides,
  }
}

function subject(
  overrides: Partial<MembershipAuthorizationSubject> = {}
): MembershipAuthorizationSubject {
  return {
    id: 'member_target',
    isActive: true,
    role: 'member',
    tenantId: 'tenant_test',
    userId: 'user_target',
    ...overrides,
  }
}

test.group('authorization/authorizer', () => {
  test('member can read accounting pages but cannot view overview or privileged actions', ({
    assert,
  }) => {
    const currentActor = actor({ membershipRole: 'member' })

    assert.isTrue(can(currentActor, 'accounting.read'))
    assert.isTrue(can(currentActor, 'accounting.writeDrafts'))
    assert.isFalse(can(currentActor, 'dashboard.view'))
    assert.isFalse(can(currentActor, 'invoice.markPaid'))
    assert.isFalse(can(currentActor, 'auditTrail.view'))
  })

  test('admin can view overview, audit trail, and invoice actions', ({ assert }) => {
    const currentActor = actor({ membershipRole: 'admin' })

    assert.isTrue(can(currentActor, 'dashboard.view'))
    assert.isTrue(can(currentActor, 'invoice.issue'))
    assert.isTrue(can(currentActor, 'invoice.markPaid'))
    assert.isTrue(can(currentActor, 'auditTrail.view'))
    assert.isTrue(can(currentActor, 'membership.toggleActive'))
  })

  test('owner can change member roles', ({ assert }) => {
    const currentActor = actor({ membershipRole: 'owner' })

    assert.isTrue(can(currentActor, 'membership.changeRole', subject({ role: 'member' })))
    assert.isTrue(can(currentActor, 'membership.changeRole', subject({ role: 'admin' })))
    assert.isFalse(can(currentActor, 'membership.changeRole', subject({ role: 'owner' })))
  })

  test('admin cannot toggle another admin membership', ({ assert }) => {
    const currentActor = actor({ membershipRole: 'admin', userId: 'user_admin' })

    assert.isFalse(
      can(currentActor, 'membership.toggleActive', subject({ role: 'admin', userId: 'user_other' }))
    )
    assert.isTrue(
      can(
        currentActor,
        'membership.toggleActive',
        subject({ role: 'member', userId: 'user_member' })
      )
    )
  })

  test('inactive members have no tenant abilities', ({ assert }) => {
    const currentActor = actor({ membershipIsActive: false, membershipRole: 'admin' })

    assert.isFalse(can(currentActor, 'accounting.read'))
    assert.isFalse(can(currentActor, 'invoice.issue'))
    assert.isFalse(can(currentActor, 'membership.toggleActive'))
  })

  test('dev operators can only access dev tools', ({ assert }) => {
    const currentActor = actor({
      isDevOperator: true,
      membershipIsActive: true,
      membershipRole: 'owner',
    })

    assert.isTrue(can(currentActor, 'devTools.access'))
    assert.isFalse(can(currentActor, 'invoice.issue'))
    assert.isFalse(can(currentActor, 'accounting.read'))
    assert.isFalse(can(currentActor, 'dashboard.view'))
    assert.isFalse(can(currentActor, 'auditTrail.view'))
    assert.isFalse(can(currentActor, 'membership.changeRole', subject()))
  })
})
