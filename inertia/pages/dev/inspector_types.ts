import type { InertiaProps } from '../../types'

export type ActionTone = 'danger' | 'primary' | 'secondary'

export type DevConsoleTab =
  | 'audit-trail'
  | 'data-generator'
  | 'members-permissions'
  | 'overview'
  | 'tenant-factory'
  | 'workflow-probes'

export type MemberRoleFilter = 'admin' | 'all' | 'member' | 'owner'
export type MemberStatusFilter = 'active' | 'all' | 'inactive'
export type ProbeType = 'customers' | 'expenses' | 'invoices'

export type Props = InertiaProps<{
  inspector: {
    audit: {
      actors: { id: string; label: string }[]
      events: {
        action: string
        actorEmail: null | string
        actorId: null | string
        actorName: null | string
        details: null | Record<string, unknown>
        entityId: string
        entityType: string
        errorCode: null | string
        id: string
        organizationId: string
        organizationName: string
        result: 'denied' | 'error' | 'success'
        timestamp: string
      }[]
      filters: {
        action: string
        actorId: string
        search: string
        tenantId: string
      }
      tenants: { id: string; label: string }[]
    }
    context: {
      accessMode: 'read_only'
      currentRole: 'admin' | 'member' | 'owner' | null
      environment: 'development'
      operator: {
        email: string
        membershipRole: 'admin' | 'member' | 'owner' | null
        name: string
        publicId: string
      }
      readOnlyBadge: string
      scenario: {
        actorId: string
        actorName: string
        actorRole: 'admin' | 'member' | 'owner' | null
        tenantId: string
        tenantName: string
        tenantSlug: string
      }
      selectedMemberId: string
      selectedMemberPermissions: {
        accountingRead: boolean
        accountingWriteDrafts: boolean
        auditTrailView: boolean
        invoiceIssue: boolean
        invoiceMarkPaid: boolean
        membershipChangeRole: boolean
        membershipList: boolean
        membershipToggleActive: boolean
      }
      selectedTenantId: string
      sessionTenant: {
        id: string
        name: string
        slug: string
      }
      singleTenantMode: boolean
      warnings: string[]
    }
    customers: {
      company: string
      createdAt: string
      email: string
      id: string
      name: string
      phone: string
    }[]
    expenses: {
      amountCents: number
      category: string
      createdAt: string
      date: string
      id: string
      label: string
      status: 'confirmed' | 'draft'
    }[]
    globalOperations: {
      action: null | string
      available: boolean
      id: string
      impact: string
      label: string
      section: 'danger_zone' | 'tenant_factory'
      tone: 'danger' | 'neutral'
      unavailableLabel?: string
    }[]
    inspectableTenants: {
      id: string
      isSessionTenant: boolean
      name: string
      slug: string
      source:
        | 'dev_console'
        | 'operator_membership'
        | 'other'
        | 'personal_workspace'
        | 'session_tenant'
        | 'single_tenant'
      sourceLabel: string
    }[]
    invoices: {
      createdAt: string
      customerCompanyName: string
      dueDate: string
      id: string
      invoiceNumber: string
      issueDate: string
      status: 'draft' | 'issued' | 'paid'
      totalInclTaxCents: number
    }[]
    members: {
      email: string
      id: string
      isActive: boolean
      isCurrentActor: boolean
      name: string
      role: 'admin' | 'member' | 'owner'
      userId: string
    }[]
    memberships: {
      id: string
      isActive: boolean
      isCurrent: boolean
      organizationId: string
      organizationName: string
      organizationSlug: string
      permissions: {
        accountingRead: boolean
        accountingWriteDrafts: boolean
        auditTrailView: boolean
        invoiceIssue: boolean
        invoiceMarkPaid: boolean
        membershipChangeRole: boolean
        membershipList: boolean
        membershipToggleActive: boolean
      }
      role: 'admin' | 'member' | 'owner'
    }[]
    metrics: {
      auditEvents: number
      customers: number
      expenses: number
      invoices: number
      members: number
    }
    recentActions: {
      action: string
      id: string
      result: 'denied' | 'error' | 'success'
      timestamp: string
    }[]
    view: {
      activeTab: DevConsoleTab
      auditSearch: string
      memberRole: MemberRoleFilter
      memberSearch: string
      memberStatus: MemberStatusFilter
      probeType: ProbeType
      selectedRecordId: string
    }
  }
}>

export type WorkflowActionState = {
  allowed: boolean
  attemptable?: boolean
  extra: Record<string, string>
  id: string
  label: string
  reason: string
  tone: ActionTone
}

export const tabs: { id: DevConsoleTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'tenant-factory', label: 'Tenant Factory' },
  { id: 'members-permissions', label: 'Members & Permissions' },
  { id: 'data-generator', label: 'Data Generator' },
  { id: 'workflow-probes', label: 'Workflow Probes' },
  { id: 'audit-trail', label: 'Audit Trail' },
]
