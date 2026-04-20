import { DomainError } from '#core/common/errors/domain_error'
import { test } from '@japa/runner'

import { mapBetterAuthError } from './map_better_auth_error.js'

test.group('mapBetterAuthError', () => {
  test('maps organization lookup and authorization failures to stable domain tags', ({
    assert,
  }) => {
    const notFound = mapBetterAuthError({ code: 'ORGANIZATION_NOT_FOUND' })
    const forbidden = mapBetterAuthError({
      body: { code: 'YOU_ARE_NOT_ALLOWED_TO_ACCESS_THIS_ORGANIZATION' },
    })

    assert.instanceOf(notFound, DomainError)
    assert.equal((notFound as DomainError).type, 'not_found')
    assert.equal((notFound as DomainError).name, 'OrganizationLookupError')

    assert.instanceOf(forbidden, DomainError)
    assert.equal((forbidden as DomainError).type, 'forbidden')
    assert.equal((forbidden as DomainError).name, 'OrganizationAuthorizationError')
  })

  test('maps organization conflicts and invitation failures away from generic auth errors', ({
    assert,
  }) => {
    const conflict = mapBetterAuthError({ code: 'ORGANIZATION_ALREADY_EXISTS' })
    const invalidInvitation = mapBetterAuthError({ code: 'INVITATION_NOT_FOUND' })

    assert.instanceOf(conflict, DomainError)
    assert.equal((conflict as DomainError).type, 'already_exists')
    assert.equal((conflict as DomainError).name, 'OrganizationConflictError')

    assert.instanceOf(invalidInvitation, DomainError)
    assert.equal((invalidInvitation as DomainError).type, 'invalid_data')
    assert.equal((invalidInvitation as DomainError).name, 'InvalidAuthPayloadError')
  })

  test('maps organization business rule failures to a stable domain tag', ({ assert }) => {
    const ownerConstraint = mapBetterAuthError({
      code: 'YOU_CANNOT_LEAVE_THE_ORGANIZATION_AS_THE_ONLY_OWNER',
    })
    const membershipLimit = mapBetterAuthError({ code: 'ORGANIZATION_MEMBERSHIP_LIMIT_REACHED' })

    assert.instanceOf(ownerConstraint, DomainError)
    assert.equal((ownerConstraint as DomainError).type, 'business_logic_error')
    assert.equal((ownerConstraint as DomainError).name, 'OrganizationBusinessRuleError')

    assert.instanceOf(membershipLimit, DomainError)
    assert.equal((membershipLimit as DomainError).type, 'business_logic_error')
    assert.equal((membershipLimit as DomainError).name, 'OrganizationBusinessRuleError')
  })
})
