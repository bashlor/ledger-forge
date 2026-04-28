import { type Data } from '@generated/data'
import { Head, usePage } from '@inertiajs/react'
import { useMemo, useState } from 'react'

import { DataTable } from '~/components/data_table'
import {
  buttonClass,
  inputClass,
  RoleBadge,
  ScrollableTable,
  ToneBadge,
  toneForAuditResult,
} from '~/components/operator_ui'
import { PageHeader } from '~/components/page_header'
import { StatusBadge } from '~/components/status_badge'
import { TableHeaderCell, TableHeadRow } from '~/components/ui'

import type { InertiaProps } from '../../types'

import { formatTimestamp, humanizeAuditAction } from '../dev/inspector_display_helpers'

type AuditContextFilter = 'accounting' | 'all' | 'user_management'
type MemberRoleFilter = 'admin' | 'all' | 'member' | 'owner'
type MemberStatusFilter = 'active' | 'all' | 'inactive'

interface OrganizationAuditEvent {
  action: string
  actorEmail: null | string
  actorId: null | string
  actorName: null | string
  boundedContext?: 'accounting' | 'user_management'
  changes: unknown
  entityId: string
  entityType: string
  id: string
  metadata: unknown
  timestamp: Date | string
}

interface OrganizationMember {
  email: string
  id: string
  isActive: boolean
  name: string
  role: 'admin' | 'member' | 'owner'
  userId: string
}

interface OrganizationPageProps {
  auditEvents: OrganizationAuditEvent[]
  canViewAuditTrail: boolean
  members: OrganizationMember[]
}

export default function OrganizationPage({
  auditEvents,
  canViewAuditTrail,
  members,
}: InertiaProps<OrganizationPageProps>) {
  const workspace = usePage<Data.SharedProps>().props.workspace
  const activeMembers = members.filter((member) => member.isActive).length
  const admins = members.filter(
    (member) => member.role === 'admin' || member.role === 'owner'
  ).length

  const [memberSearch, setMemberSearch] = useState('')
  const [memberRoleFilter, setMemberRoleFilter] = useState<MemberRoleFilter>('all')
  const [memberStatusFilter, setMemberStatusFilter] = useState<MemberStatusFilter>('all')
  const [memberVisibleCount, setMemberVisibleCount] = useState(12)

  const [auditSearch, setAuditSearch] = useState('')
  const [auditActionFilter, setAuditActionFilter] = useState('')
  const [auditContextFilter, setAuditContextFilter] = useState<AuditContextFilter>('all')
  const [auditVisibleCount, setAuditVisibleCount] = useState(20)

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase()
    return members.filter((member) => {
      if (memberRoleFilter !== 'all' && member.role !== memberRoleFilter) {
        return false
      }
      if (memberStatusFilter === 'active' && !member.isActive) {
        return false
      }
      if (memberStatusFilter === 'inactive' && member.isActive) {
        return false
      }
      if (!q) {
        return true
      }
      return (
        member.name.toLowerCase().includes(q) ||
        member.email.toLowerCase().includes(q) ||
        member.userId.toLowerCase().includes(q)
      )
    })
  }, [memberRoleFilter, memberSearch, memberStatusFilter, members])

  const filteredAuditEvents = useMemo(() => {
    const q = auditSearch.trim().toLowerCase()
    const actionNeedle = auditActionFilter.trim().toLowerCase()
    return auditEvents.filter((event) => {
      if (auditContextFilter !== 'all' && auditContextForEvent(event) !== auditContextFilter) {
        return false
      }
      if (actionNeedle && !event.action.toLowerCase().includes(actionNeedle)) {
        return false
      }
      if (!q) {
        return true
      }
      const actor =
        `${event.actorName ?? ''} ${event.actorEmail ?? ''} ${event.actorId ?? ''}`.toLowerCase()
      const entity = `${event.entityType} ${event.entityId}`.toLowerCase()
      const details = compactDetails(event)?.toLowerCase() ?? ''
      return (
        event.action.toLowerCase().includes(q) ||
        actor.includes(q) ||
        entity.includes(q) ||
        details.includes(q)
      )
    })
  }, [auditActionFilter, auditContextFilter, auditEvents, auditSearch])

  const visibleMembers = filteredMembers.slice(0, memberVisibleCount)
  const visibleAuditEvents = filteredAuditEvents.slice(0, auditVisibleCount)

  return (
    <>
      <Head title="Organization" />
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[1.75rem] border border-outline-variant/15 bg-surface-container-lowest p-6 shadow-ambient-tight sm:p-7">
          <PageHeader
            description="Review the active workspace members and the latest tenant audit events."
            eyebrow="Workspace"
            title={workspace?.name ?? 'Organization'}
          />

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <SummaryTile label="Members" value={String(members.length)} />
            <SummaryTile label="Active" value={String(activeMembers)} />
            <SummaryTile label="Admins & owner" value={String(admins)} />
          </div>
        </section>

        <DataTable
          emptyMessage="No members match the current filters."
          headerContent={
            <div className="grid min-w-[720px] gap-2 lg:grid-cols-[minmax(0,1.4fr)_180px_180px]">
              <input
                className={inputClass()}
                onChange={(event) => setMemberSearch(event.target.value)}
                placeholder="Search name, email, user id"
                value={memberSearch}
              />
              <select
                className={inputClass()}
                onChange={(event) => setMemberRoleFilter(event.target.value as MemberRoleFilter)}
                value={memberRoleFilter}
              >
                <option value="all">All roles</option>
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
                <option value="member">Member</option>
              </select>
              <select
                className={inputClass()}
                onChange={(event) =>
                  setMemberStatusFilter(event.target.value as MemberStatusFilter)
                }
                value={memberStatusFilter}
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          }
          isEmpty={visibleMembers.length === 0}
          title="Members"
        >
          <div className="space-y-3">
            <ScrollableTable maxHeightClass="max-h-[38rem]">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead className="sticky top-0 z-20">
                  <TableHeadRow className="tracking-[0.14em]">
                    <TableHeaderCell className="py-2">Name</TableHeaderCell>
                    <TableHeaderCell className="py-2">Email</TableHeaderCell>
                    <TableHeaderCell className="py-2">Role</TableHeaderCell>
                    <TableHeaderCell className="py-2">Status</TableHeaderCell>
                  </TableHeadRow>
                </thead>
                <tbody>
                  {visibleMembers.map((member, index) => (
                    <tr
                      className={`border-b border-outline-variant/8 ${
                        index % 2 === 0
                          ? 'bg-surface-container-lowest'
                          : 'bg-surface-container-lowest/70'
                      }`}
                      key={member.id}
                    >
                      <td className="px-3 py-2.5 font-medium text-on-surface">{member.name}</td>
                      <td className="px-3 py-2.5 text-on-surface-variant">{member.email}</td>
                      <td className="px-3 py-2.5">
                        <RoleBadge role={member.role} />
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge status={member.isActive ? 'confirmed' : 'overdue'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollableTable>

            {filteredMembers.length > memberVisibleCount ? (
              <div className="flex justify-end">
                <button
                  className={buttonClass('secondary')}
                  onClick={() => setMemberVisibleCount((count) => count + 12)}
                  type="button"
                >
                  Load more
                </button>
              </div>
            ) : null}
          </div>
        </DataTable>

        {canViewAuditTrail ? (
          <DataTable
            emptyMessage="No audit events match the current filters."
            headerContent={
              <div className="grid min-w-[760px] gap-2 md:grid-cols-[minmax(0,1fr)_200px_200px]">
                <input
                  className={inputClass()}
                  onChange={(event) => setAuditSearch(event.target.value)}
                  placeholder="Search actor, entity, action, payload"
                  value={auditSearch}
                />
                <input
                  className={inputClass()}
                  onChange={(event) => setAuditActionFilter(event.target.value)}
                  placeholder="Filter action"
                  value={auditActionFilter}
                />
                <select
                  className={inputClass()}
                  onChange={(event) =>
                    setAuditContextFilter(event.target.value as AuditContextFilter)
                  }
                  value={auditContextFilter}
                >
                  <option value="all">All audit trails</option>
                  <option value="accounting">Accounting</option>
                  <option value="user_management">User management</option>
                </select>
              </div>
            }
            isEmpty={visibleAuditEvents.length === 0}
            title="Audit trail"
          >
            <div className="space-y-3">
              <ScrollableTable maxHeightClass="max-h-[34rem]">
                <table className="w-full min-w-[960px] border-collapse text-left text-sm">
                  <thead className="sticky top-0 z-20">
                    <TableHeadRow className="tracking-[0.14em]">
                      <TableHeaderCell className="py-2">Timestamp</TableHeaderCell>
                      <TableHeaderCell className="py-2">Actor</TableHeaderCell>
                      <TableHeaderCell className="py-2">Action</TableHeaderCell>
                      <TableHeaderCell className="py-2">Entity</TableHeaderCell>
                      <TableHeaderCell className="py-2">Result</TableHeaderCell>
                      <TableHeaderCell className="py-2">Details</TableHeaderCell>
                    </TableHeadRow>
                  </thead>
                  <tbody>
                    {visibleAuditEvents.map((event, index) => (
                      <tr
                        className={`border-b border-outline-variant/8 ${
                          index % 2 === 0
                            ? 'bg-surface-container-lowest'
                            : 'bg-surface-container-lowest/70'
                        }`}
                        key={event.id}
                      >
                        <td className="px-3 py-2.5 text-xs text-on-surface-variant">
                          {formatTimestamp(String(event.timestamp))}
                        </td>
                        <td className="px-3 py-2.5 text-on-surface">
                          {event.actorName || event.actorEmail || event.actorId || 'system'}
                        </td>
                        <td className="px-3 py-2.5 font-medium text-on-surface">
                          {humanizeAuditAction(event.action)}
                        </td>
                        <td className="px-3 py-2.5 text-on-surface-variant">
                          {auditContextLabel(auditContextForEvent(event))} · {event.entityType}:
                          {event.entityId}
                        </td>
                        <td className="px-3 py-2.5">
                          <ToneBadge
                            label={auditResultLabel(event.metadata)}
                            tone={toneForAuditResult(auditResultFromMetadata(event.metadata))}
                          />
                        </td>
                        <td className="max-w-[280px] truncate px-3 py-2.5 font-mono text-xs text-on-surface-variant">
                          {compactDetails(event) ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollableTable>

              {filteredAuditEvents.length > auditVisibleCount ? (
                <div className="flex justify-end">
                  <button
                    className={buttonClass('secondary')}
                    onClick={() => setAuditVisibleCount((count) => count + 20)}
                    type="button"
                  >
                    Load more
                  </button>
                </div>
              ) : null}
            </div>
          </DataTable>
        ) : null}
      </div>
    </>
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
  return context === 'accounting' ? 'Accounting' : 'User management'
}

function auditResultFromMetadata(metadata: unknown): 'denied' | 'error' | 'success' {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return 'success'
  }

  const candidate = (metadata as Record<string, unknown>).result
  return candidate === 'denied' || candidate === 'error' ? candidate : 'success'
}

function auditResultLabel(metadata: unknown): string {
  return auditResultFromMetadata(metadata)
}

function compactDetails(event: OrganizationAuditEvent): null | string {
  const details: Record<string, unknown> = {}
  if (event.changes && typeof event.changes === 'object') {
    details.changes = event.changes
  }
  if (event.metadata && typeof event.metadata === 'object') {
    details.metadata = event.metadata
  }

  return Object.keys(details).length > 0 ? JSON.stringify(details) : null
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface-container-low px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
        {label}
      </p>
      <p className="mt-1.5 font-headline text-2xl font-extrabold text-on-surface">{value}</p>
    </div>
  )
}
