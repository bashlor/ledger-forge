export type ActionName =
  | 'attempt-forbidden-access'
  | 'change-invoice-status'
  | 'change-member-role'
  | 'clear-tenant-data'
  | 'confirm-expense'
  | 'create-customer-batch'
  | 'create-expense-test'
  | 'create-invoice-test'
  | 'create-tenant'
  | 'delete-confirmed-expense'
  | 'delete-customer'
  | 'delete-expense'
  | 'delete-invoice'
  | 'generate-demo-data'
  | 'reset-database'
  | 'reset-tenant'
  | 'switch-tenant'
  | 'toggle-member-active'
  | 'update-customer'
  | 'update-invoice-draft'

export interface DevInspectorAuditEventDto {
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
  timestamp: Date
}

export interface DevInspectorCustomerDto {
  company: string
  createdAt: Date
  email: string
  id: string
  name: string
  phone: string
}

export interface DevInspectorExpenseDto {
  amountCents: number
  category: string
  createdAt: Date
  date: string
  id: string
  label: string
  status: 'confirmed' | 'draft'
}

export interface DevInspectorFilters {
  action?: string
  actorId?: string
  auditSearch?: string
  expenseId?: string
  invoiceId?: string
  memberId?: string
  memberRole?: string
  memberSearch?: string
  memberStatus?: string
  probeType?: string
  selectedRecordId?: string
  tab?: string
  tenantId?: string
}

export interface DevInspectorInvoiceDto {
  createdAt: Date
  customerCompanyName: string
  dueDate: string
  id: string
  invoiceNumber: string
  issueDate: string
  status: 'draft' | 'issued' | 'paid'
  totalInclTaxCents: number
}

export interface DevInspectorMemberDto {
  email: string
  id: string
  isActive: boolean
  isCurrentActor: boolean
  name: string
  role: 'admin' | 'member' | 'owner'
  userId: string
}

export interface DevInspectorMembershipDto {
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
}

export interface DevInspectorMetricsDto {
  auditEvents: number
  customers: number
  expenses: number
  invoices: number
  members: number
}

export interface DevInspectorPageDto {
  audit: {
    actors: { id: string; label: string }[]
    events: DevInspectorAuditEventDto[]
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
    activeTenantId: string
    activeTenantName: string
    activeTenantSlug: string
    currentRole: 'admin' | 'member' | 'owner' | null
    environment: 'development'
    isAnonymous: boolean
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
    selectedMemberName: string
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
    selectedMemberRole: 'admin' | 'member' | 'owner' | null
    selectedTenantId: string
    selectedTenantName: string
    sessionTenant: {
      id: string
      name: string
      slug: string
    }
    singleTenantMode: boolean
    userEmail: string
    userName: string
    userPublicId: string
  }
  customers: DevInspectorCustomerDto[]
  expenses: DevInspectorExpenseDto[]
  globalOperations: {
    action: ActionName | null
    available: boolean
    id: string
    impact: string
    label: string
    section: 'danger_zone' | 'tenant_factory'
    tone: 'danger' | 'neutral'
    unavailableLabel?: string
  }[]
  inspectableTenants: DevInspectorTenantOptionDto[]
  invoices: DevInspectorInvoiceDto[]
  members: DevInspectorMemberDto[]
  memberships: DevInspectorMembershipDto[]
  metrics: DevInspectorMetricsDto
  recentActions: {
    action: string
    id: string
    result: 'denied' | 'error' | 'success'
    timestamp: Date
  }[]
  view: {
    activeTab: DevInspectorTab
    auditSearch: string
    memberRole: 'admin' | 'all' | 'member' | 'owner'
    memberSearch: string
    memberStatus: 'active' | 'all' | 'inactive'
    probeType: 'customers' | 'expenses' | 'invoices'
    selectedRecordId: string
  }
}

export type DevInspectorTab =
  | 'audit-trail'
  | 'data-generator'
  | 'members-permissions'
  | 'overview'
  | 'tenant-factory'
  | 'workflow-probes'

export interface DevInspectorTenantOptionDto {
  id: string
  isSessionTenant: boolean
  name: string
  slug: string
}

export interface DevOperatorActionInput {
  count?: number
  customerId?: string
  expenseId?: string
  invoiceId?: string
  memberId?: string
  ownerEmail?: string
  ownerPassword?: string
  seedMode?: string
  tab?: string
  tenantId?: string
  tenantName?: string
}

const ACTION_NAMES: readonly ActionName[] = [
  'attempt-forbidden-access',
  'change-invoice-status',
  'change-member-role',
  'clear-tenant-data',
  'confirm-expense',
  'create-tenant',
  'create-customer-batch',
  'create-expense-test',
  'create-invoice-test',
  'delete-customer',
  'delete-confirmed-expense',
  'delete-expense',
  'delete-invoice',
  'generate-demo-data',
  'reset-database',
  'reset-tenant',
  'switch-tenant',
  'toggle-member-active',
  'update-customer',
  'update-invoice-draft',
]

export function isDevOperatorActionName(value: string): value is ActionName {
  return ACTION_NAMES.includes(value as ActionName)
}
