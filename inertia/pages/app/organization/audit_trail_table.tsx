import { GhostButton } from '~/components/button'
import { ToneBadge } from '~/components/operator_ui'
import { TableHeaderCell, TableHeadRow } from '~/components/ui'

import type { OrganizationAuditEvent } from './audit_types'

import { formatTimestamp, humanizeAuditAction } from '../../dev/inspector_display_helpers'

interface AuditTrailTableProps {
  events: OrganizationAuditEvent[]
  onViewDetails: (event: OrganizationAuditEvent) => void
}

export function AuditTrailTable({ events, onViewDetails }: AuditTrailTableProps) {
  return (
    <table className="tonal-table organization-audit-table w-full min-w-[960px] border-collapse text-left text-sm">
      <thead>
        <TableHeadRow className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          <TableHeaderCell>Time</TableHeaderCell>
          <TableHeaderCell>Actor</TableHeaderCell>
          <TableHeaderCell>Action</TableHeaderCell>
          <TableHeaderCell>Entity</TableHeaderCell>
          <TableHeaderCell>Result</TableHeaderCell>
          <TableHeaderCell className="text-right">Details</TableHeaderCell>
        </TableHeadRow>
      </thead>
      <tbody className="divide-y divide-slate-200/80">
        {events.map((event) => (
          <tr
            className="group transition-colors duration-150 ease-out hover:bg-slate-50 focus-within:bg-slate-50"
            key={event.id}
          >
            <td className="whitespace-nowrap px-5 py-4 text-xs tabular-nums text-slate-600">
              {formatTimestamp(String(event.timestamp))}
            </td>
            <td className="max-w-[11rem] truncate px-5 py-4 text-sm text-slate-900">
              {event.actorName?.trim() ||
                event.actorEmail?.trim() ||
                event.actorId ||
                'system'}
            </td>
            <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-950">
              {humanizeAuditAction(event.action)}
            </td>
            <td className="max-w-[14rem] px-5 py-4 font-mono text-xs text-slate-600">
              <span className="text-slate-500">{auditContextLabel(auditContextForEvent(event))}</span>{' '}
              <span className="text-slate-400">·</span> {event.entityType}
              <span className="text-slate-400">:</span>
              {shortEntityId(event.entityId)}
            </td>
            <td className="whitespace-nowrap px-5 py-4">
              <ToneBadge label={auditResultLabel(event.metadata)} tone={auditTone(event.metadata)} />
            </td>
            <td className="whitespace-nowrap px-5 py-4 text-right">
              <GhostButton
                className="py-2 text-sm font-semibold text-primary hover:bg-primary/5 hover:text-primary-dim"
                onClick={() => onViewDetails(event)}
                type="button"
              >
                View details
              </GhostButton>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function auditContextForEvent(event: OrganizationAuditEvent): 'accounting' | 'user_management' {
  if (event.boundedContext) {
    return event.boundedContext
  }

  return event.entityType === 'customer' ||
    event.entityType === 'expense' ||
    event.entityType === 'invoice'
    ? 'accounting'
    : 'user_management'
}

function auditContextLabel(context: 'accounting' | 'user_management'): string {
  return context === 'accounting' ? 'Accounting' : 'User mgmt'
}

function shortEntityId(id: string): string {
  if (id.length <= 14) {
    return id
  }
  return `${id.slice(0, 10)}…`
}

function auditResultFromMetadata(metadata: unknown): 'denied' | 'error' | 'success' | 'warning' {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return 'success'
  }

  const candidate = (metadata as Record<string, unknown>).result
  if (candidate === 'warning') {
    return 'warning'
  }
  return candidate === 'denied' || candidate === 'error' ? candidate : 'success'
}

function auditTone(metadata: unknown): 'danger' | 'success' | 'warning' {
  const r = auditResultFromMetadata(metadata)
  if (r === 'warning' || r === 'denied') {
    return 'warning'
  }
  if (r === 'error') {
    return 'danger'
  }
  return 'success'
}

function auditResultLabel(metadata: unknown): string {
  const r = auditResultFromMetadata(metadata)
  if (r === 'success') {
    return 'Success'
  }
  if (r === 'warning') {
    return 'Warning'
  }
  if (r === 'denied') {
    return 'Denied'
  }
  return 'Failed'
}
