import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Props } from './inspector_types'

import DevInspectorPage from './inspector'

const routerGetMock = vi.hoisted(() => vi.fn())
const routerPostMock = vi.hoisted(() => vi.fn())

vi.mock('@inertiajs/react', () => ({
  Head: () => null,
  router: {
    get: routerGetMock,
    post: routerPostMock,
  },
}))

function buildProps(
  overrides: Partial<Props['inspector']> = {},
  contextOverrides: Partial<Props['inspector']['context']> = {},
  viewOverrides: Partial<Props['inspector']['view']> = {}
): Props {
  return {
    devTools: {
      accessHref: '/_dev',
      canAccess: true,
      enabled: true,
    },
    errors: {},
    flash: {
      notification: null,
    },
    inspector: {
      audit: {
        actors: [{ id: 'actor-1', label: 'Pat User' }],
        events: [
          {
            action: 'dev_change_member_role',
            actorEmail: 'pat@example.com',
            actorId: 'actor-1',
            actorName: 'Pat User',
            details: { after: { role: 'admin' } },
            entityId: 'member-2',
            entityType: 'member',
            errorCode: null,
            id: 'audit-1',
            organizationId: 'tenant-1',
            organizationName: 'Tenant One',
            result: 'success',
            timestamp: '2026-04-23T09:00:00.000Z',
          },
        ],
        filters: {
          action: '',
          actorId: '',
          search: '',
          tenantId: 'tenant-1',
        },
        tenants: [{ id: 'tenant-1', label: 'Tenant One' }],
      },
      context: {
        accessMode: 'read_only',
        currentRole: 'owner',
        environment: 'development',
        operator: {
          email: 'dev@example.com',
          membershipRole: 'owner',
          name: 'Dev Operator',
          publicId: 'dev-public-id',
        },
        readOnlyBadge: 'Read-Only Access',
        scenario: {
          actorId: 'user-1',
          actorName: 'Pat User',
          actorRole: 'owner',
          tenantId: 'tenant-1',
          tenantName: 'Tenant One',
          tenantSlug: 'tenant-one',
        },
        selectedMemberId: 'member-1',
        selectedMemberPermissions: {
          accountingRead: true,
          accountingWriteDrafts: true,
          auditTrailView: true,
          invoiceIssue: true,
          invoiceMarkPaid: true,
          membershipChangeRole: true,
          membershipList: true,
          membershipToggleActive: true,
        },
        selectedTenantId: 'tenant-1',
        sessionTenant: {
          id: 'tenant-dev',
          name: 'Dev Operator Tenant',
          slug: 'dev-tenant',
        },
        singleTenantMode: false,
        ...contextOverrides,
      },
      customers: [
        {
          company: 'Acme',
          createdAt: '2026-04-23T08:00:00.000Z',
          email: 'contact@acme.test',
          id: 'customer-1',
          name: 'Pat Contact',
          phone: '+33 6 00 00 00 00',
        },
      ],
      expenses: [
        {
          amountCents: 1200,
          category: 'Software',
          createdAt: '2026-04-23T08:00:00.000Z',
          date: '2026-04-23',
          id: 'expense-1',
          label: 'Notion',
          status: 'draft',
        },
      ],
      globalOperations: [
        {
          action: 'reset-tenant',
          available: false,
          id: 'reset-tenant',
          impact: 'Purge and reseed the selected tenant.',
          label: 'Reset selected tenant',
          section: 'danger_zone',
          tone: 'danger',
          unavailableLabel: 'Local dev only',
        },
      ],
      inspectableTenants: [
        {
          id: 'tenant-1',
          isSessionTenant: false,
          name: 'Tenant One',
          slug: 'tenant-one',
        },
        {
          id: 'tenant-dev',
          isSessionTenant: true,
          name: 'Dev Operator Tenant',
          slug: 'dev-tenant',
        },
      ],
      invoices: [
        {
          createdAt: '2026-04-23T08:00:00.000Z',
          customerCompanyName: 'Acme',
          dueDate: '2026-05-01',
          id: 'invoice-1',
          invoiceNumber: 'INV-001',
          issueDate: '2026-04-23',
          status: 'draft',
          totalInclTaxCents: 24000,
        },
      ],
      members: [
        {
          email: 'pat@example.com',
          id: 'member-1',
          isActive: true,
          isCurrentActor: true,
          name: 'Pat User',
          role: 'owner',
          userId: 'user-1',
        },
        {
          email: 'alex@example.com',
          id: 'member-2',
          isActive: true,
          isCurrentActor: false,
          name: 'Alex User',
          role: 'member',
          userId: 'user-2',
        },
      ],
      memberships: [],
      metrics: {
        auditEvents: 1,
        customers: 1,
        expenses: 1,
        invoices: 1,
        members: 2,
      },
      recentActions: [
        {
          action: 'dev_change_member_role',
          id: 'audit-1',
          result: 'success',
          timestamp: '2026-04-23T09:00:00.000Z',
        },
      ],
      view: {
        activeTab: 'overview',
        auditSearch: '',
        memberRole: 'all',
        memberSearch: '',
        memberStatus: 'all',
        probeType: 'invoices',
        selectedRecordId: 'invoice-1',
        ...viewOverrides,
      },
      ...overrides,
    },
    user: {
      email: 'dev@example.com',
      fullName: 'Dev Operator',
      id: 'dev-public-id',
      image: null,
      initials: 'DO',
      isAnonymous: false,
      isDevOperator: true,
    },
    workspace: undefined,
  }
}

describe('dev inspector page', () => {
  beforeEach(() => {
    routerGetMock.mockReset()
    routerPostMock.mockReset()
  })

  it('renders the read-only shell and core tabs', () => {
    render(<DevInspectorPage {...buildProps()} />)

    expect(screen.getByText('Read-Only Access')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Overview' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Tenant Factory\s*2/ })).toBeInTheDocument()
    expect(screen.getByText('Quick Metrics')).toBeInTheDocument()
  })

  it('routes tab changes through the inspector query refresh', () => {
    render(<DevInspectorPage {...buildProps()} />)

    fireEvent.click(screen.getByRole('button', { name: /Audit Trail\s*1/ }))

    expect(routerGetMock).toHaveBeenCalledWith(
      '/_dev/inspector',
      expect.objectContaining({ tab: 'audit-trail', tenantId: 'tenant-1' }),
      expect.objectContaining({
        preserveScroll: true,
        preserveState: true,
        replace: true,
      })
    )
  })

  it('opens the tenant modal from the tenant factory section', () => {
    render(<DevInspectorPage {...buildProps({}, {}, { activeTab: 'tenant-factory' })} />)

    fireEvent.click(screen.getByRole('button', { name: 'Create tenant' }))

    expect(screen.getByRole('dialog', { name: 'Create tenant' })).toBeInTheDocument()
    expect(screen.getByText('Owner email')).toBeInTheDocument()
  })

  it('keeps tenant creation disabled in single-tenant mode and surfaces unavailable labels', () => {
    render(
      <DevInspectorPage
        {...buildProps({}, { singleTenantMode: true }, { activeTab: 'tenant-factory' })}
      />
    )

    expect(screen.getByRole('button', { name: 'Unavailable' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Local dev only' })).toBeDisabled()
    expect(screen.queryByRole('dialog', { name: 'Create tenant' })).not.toBeInTheDocument()
  })
})
