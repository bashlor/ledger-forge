import { describe, expect, it } from 'vitest'

import { resolveErrorHomeHref } from './error_home_link'

const baseProps = {
  devTools: {
    accessHref: '/_dev',
    canAccess: false,
    enabled: false,
  },
  errors: {},
  flash: {
    notification: null,
  },
  permissions: {
    canReadAccounting: false,
    canViewAuditTrail: false,
    canViewOrganization: false,
    canViewOverview: false,
  },
  user: undefined,
  workspace: undefined,
}

describe('error home link', () => {
  it('sends dev operators back to dev tools when available', () => {
    expect(
      resolveErrorHomeHref({
        ...baseProps,
        devTools: {
          accessHref: '/_dev',
          canAccess: true,
          enabled: true,
        },
      })
    ).toBe('/_dev')
  })

  it('sends regular accounting members to customers instead of overview', () => {
    expect(
      resolveErrorHomeHref({
        ...baseProps,
        permissions: {
          ...baseProps.permissions,
          canReadAccounting: true,
        },
        user: {
          email: 'member@example.com',
          fullName: 'Member User',
          id: 'member-public-id',
          image: null,
          initials: 'MU',
          isAnonymous: false,
          isDevOperator: false,
        },
      })
    ).toBe('/customers')
  })

  it('falls back to account for signed-in users without tenant page access', () => {
    expect(
      resolveErrorHomeHref({
        ...baseProps,
        user: {
          email: 'inactive@example.com',
          fullName: 'Inactive User',
          id: 'inactive-public-id',
          image: null,
          initials: 'IU',
          isAnonymous: false,
          isDevOperator: false,
        },
      })
    ).toBe('/account')
  })
})
