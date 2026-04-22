import { type DevInspectorTab } from '#core/dev_tools/application/dev_operator_console_types'

export function addDays(value: string, days: number): string {
  const [year, month, day] = value.split('-').map(Number)
  return dateOnlyUtc(new Date(Date.UTC(year, month - 1, day + days)))
}

export function auditEventDetails(
  changes: unknown,
  metadata: unknown
): null | Record<string, unknown> {
  const details: Record<string, unknown> = {}

  if (changes && typeof changes === 'object' && !Array.isArray(changes)) {
    details.changes = changes as Record<string, unknown>
  }

  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    details.metadata = metadata as Record<string, unknown>
  }

  return Object.keys(details).length > 0 ? details : null
}

export function dateOnlyUtc(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function metadataErrorCode(value: unknown): null | string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  const candidate = (value as Record<string, unknown>).errorCode
  return typeof candidate === 'string' && candidate.length > 0 ? candidate : null
}

export function metadataResult(value: unknown): 'denied' | 'error' | 'success' {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return 'success'
  }

  const candidate = (value as Record<string, unknown>).result
  return candidate === 'denied' || candidate === 'error' ? candidate : 'success'
}

export function resolveActiveTab(value?: string): DevInspectorTab {
  switch (value?.trim()) {
    case 'audit-trail':
    case 'data-generator':
    case 'members-permissions':
    case 'overview':
    case 'tenant-factory':
    case 'workflow-probes':
      return value as DevInspectorTab
    default:
      return 'overview'
  }
}

export function resolveMemberRole(value?: string): 'admin' | 'all' | 'member' | 'owner' {
  switch (value?.trim()) {
    case 'admin':
      return 'admin'
    case 'member':
      return 'member'
    case 'owner':
      return 'owner'
    default:
      return 'all'
  }
}

export function resolveMemberStatus(value?: string): 'active' | 'all' | 'inactive' {
  switch (value?.trim()) {
    case 'active':
      return 'active'
    case 'inactive':
      return 'inactive'
    default:
      return 'all'
  }
}

export function resolveProbeType(value?: string): 'customers' | 'expenses' | 'invoices' {
  switch (value?.trim()) {
    case 'customers':
      return 'customers'
    case 'expenses':
      return 'expenses'
    default:
      return 'invoices'
  }
}

export function selectedTenantOptions(accessibleTenantIds: string[], activeTenantId: string) {
  return accessibleTenantIds.map((tenantId) => ({
    id: tenantId,
    label: tenantId === activeTenantId ? `${tenantId} (active)` : tenantId,
  }))
}

export function shortToken(): string {
  return Math.random().toString(36).slice(2, 8)
}
