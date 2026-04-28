import { Head } from '@inertiajs/react'
import { useMemo, useState } from 'react'

import { PrimaryButton } from '~/components/button'
import { DataTable } from '~/components/data_table'
import { FilterSelect } from '~/components/filter_select'
import { MetricCard } from '~/components/metric_card'
import { PageHeader } from '~/components/page_header'
import { SearchForm } from '~/components/search_form'

import type { InertiaProps } from '../../types'
import type { OrganizationAuditEvent } from './organization/audit_types'
import type { OrganizationMemberRow } from './organization/member_row_actions_menu'

import { AuditEventDetailDrawer } from './organization/audit_event_detail_drawer'
import { AuditTrailTable } from './organization/audit_trail_table'
import { MembersTable } from './organization/members_table'

type AuditContextFilter = 'accounting' | 'all' | 'user_management'
type MemberRoleFilter = 'admin' | 'all' | 'member' | 'owner'
type MemberStatusFilter = 'active' | 'all' | 'inactive'

const MEMBER_ROLE_FILTER_OPTIONS = [
  { label: 'All roles', value: 'all' },
  { label: 'Owner', value: 'owner' },
  { label: 'Admin', value: 'admin' },
  { label: 'Member', value: 'member' },
] as const

const MEMBER_STATUS_FILTER_OPTIONS = [
  { label: 'All statuses', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
] as const

const AUDIT_CONTEXT_OPTIONS = [
  { label: 'All contexts', value: 'all' },
  { label: 'Accounting', value: 'accounting' },
  { label: 'User management', value: 'user_management' },
] as const

interface OrganizationPageProps {
  auditEvents: OrganizationAuditEvent[]
  canManageMembershipRoles: boolean
  canToggleMembershipStatus: boolean
  canViewAuditTrail: boolean
  members: OrganizationMemberRow[]
  viewerMembershipRole: 'admin' | 'member' | 'owner'
  viewerUserId: string
}

export default function OrganizationPage({
  auditEvents,
  canManageMembershipRoles,
  canToggleMembershipStatus,
  canViewAuditTrail,
  members,
  viewerMembershipRole,
  viewerUserId,
}: InertiaProps<OrganizationPageProps>) {
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
  const [auditDetail, setAuditDetail] = useState<null | OrganizationAuditEvent>(null)
  const [patchingId, setPatchingId] = useState<null | string>(null)

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
      if (auditContextFilter !== 'all' && auditContextForFilter(event) !== auditContextFilter) {
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
      const details = compactDetailsForSearch(event)?.toLowerCase() ?? ''
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

  const membersToolbar = (
    <>
      <SearchForm
        ariaLabel="Search members"
        onSubmit={setMemberSearch}
        placeholder="Search name, email, or user id"
        value={memberSearch}
        variant="premium"
      />
      <FilterSelect
        aria-label="Filter members by role"
        onChange={(event) => setMemberRoleFilter(event.target.value as MemberRoleFilter)}
        options={[...MEMBER_ROLE_FILTER_OPTIONS]}
        value={memberRoleFilter}
      />
      <FilterSelect
        aria-label="Filter members by status"
        onChange={(event) => setMemberStatusFilter(event.target.value as MemberStatusFilter)}
        options={[...MEMBER_STATUS_FILTER_OPTIONS]}
        value={memberStatusFilter}
      />
    </>
  )

  const auditToolbar = (
    <>
      <SearchForm
        ariaLabel="Search audit trail"
        onSubmit={setAuditSearch}
        placeholder="Search actor, entity, or action"
        value={auditSearch}
        variant="premium"
      />
      <div className="flex w-full min-w-0 flex-1 rounded-xl border border-slate-200/95 bg-white shadow-sm shadow-slate-900/[0.04] ring-1 ring-slate-900/[0.03] transition-[border-color,box-shadow] duration-150 ease-out focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 sm:max-w-xs">
        <input
          aria-label="Filter by action keyword"
          className="h-10 min-w-0 flex-1 rounded-xl border-0 bg-transparent px-3 text-sm text-slate-900 outline-hidden placeholder:text-slate-400"
          onChange={(event) => setAuditActionFilter(event.target.value)}
          placeholder="Filter by action"
          type="search"
          value={auditActionFilter}
        />
      </div>
      <FilterSelect
        aria-label="Filter audit by domain"
        onChange={(event) => setAuditContextFilter(event.target.value as AuditContextFilter)}
        options={[...AUDIT_CONTEXT_OPTIONS]}
        value={auditContextFilter}
      />
    </>
  )

  return (
    <>
      <Head title="Organization" />

      <div className="mx-auto max-w-7xl space-y-5">
        <PageHeader
          className="sm:gap-4"
          description="Manage members, roles and workspace activity."
          eyebrow="Workspace"
          title="Organization"
        />

        <section className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          <MetricCard icon="group" label="Members" value={String(members.length)} />
          <MetricCard icon="task_alt" label="Active" value={String(activeMembers)} />
          <MetricCard icon="settings" label="Admins & owners" value={String(admins)} />
        </section>

        <DataTable
          emptyMessage="No members match the current filters."
          headerClassName="border-b border-slate-200/90 bg-white px-5 py-4 sm:px-6"
          headerContent={
            <div className="flex w-full min-w-0 flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
                {membersToolbar}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <PrimaryButton
                  className="rounded-xl px-4 py-2.5 opacity-90"
                  disabled
                  title="Invitations are not available yet"
                  type="button"
                >
                  Invite member
                </PrimaryButton>
                <span className="hidden text-xs text-slate-400 sm:inline">Coming soon</span>
              </div>
            </div>
          }
          isEmpty={filteredMembers.length === 0}
          panelClassName="overflow-hidden rounded-xl border border-slate-200/95 bg-white shadow-md shadow-slate-900/[0.06] ring-1 ring-slate-900/[0.04]"
          title="Members"
          titleClassName="text-slate-950 lg:text-base"
          toolbarClassName="gap-3"
        >
          <>
            <MembersTable
              canManageMembershipRoles={canManageMembershipRoles}
              canToggleMembershipStatus={canToggleMembershipStatus}
              items={visibleMembers}
              patchingId={patchingId}
              setPatchingId={setPatchingId}
              viewerMembershipRole={viewerMembershipRole}
              viewerUserId={viewerUserId}
            />

            {filteredMembers.length > memberVisibleCount ? (
              <div className="border-t border-slate-200/80 px-5 py-4 sm:px-6">
                <div className="flex justify-end">
                  <button
                    className="rounded-xl border border-slate-200/95 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition-colors duration-150 hover:bg-slate-50"
                    onClick={() => setMemberVisibleCount((count) => count + 12)}
                    type="button"
                  >
                    Load more
                  </button>
                </div>
              </div>
            ) : null}
          </>
        </DataTable>

        {canViewAuditTrail ? (
          <DataTable
            emptyMessage="No audit events match the current filters."
            headerClassName="border-b border-slate-200/90 bg-slate-50/80 px-5 py-4 sm:px-6"
            headerContent={
              <div className="flex w-full flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
                {auditToolbar}
              </div>
            }
            isEmpty={filteredAuditEvents.length === 0}
            panelClassName="overflow-hidden rounded-xl border border-slate-200/90 bg-slate-50/40 shadow-sm shadow-slate-900/[0.04] ring-1 ring-slate-900/[0.03]"
            title="Audit trail"
            titleClassName="text-slate-600 lg:text-[15px]"
            toolbarClassName="gap-3"
          >
            <>
              <AuditTrailTable
                events={visibleAuditEvents}
                onViewDetails={(event) => setAuditDetail(event)}
              />

              {filteredAuditEvents.length > auditVisibleCount ? (
                <div className="border-t border-slate-200/80 px-5 py-4 sm:px-6">
                  <div className="flex justify-end">
                    <button
                      className="rounded-xl border border-slate-200/95 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition-colors duration-150 hover:bg-slate-50"
                      onClick={() => setAuditVisibleCount((count) => count + 20)}
                      type="button"
                    >
                      Load more
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          </DataTable>
        ) : null}
      </div>

      <AuditEventDetailDrawer event={auditDetail} onClose={() => setAuditDetail(null)} />
    </>
  )
}

function auditContextForFilter(event: OrganizationAuditEvent): 'accounting' | 'user_management' {
  if (event.boundedContext) {
    return event.boundedContext
  }

  return event.entityType === 'customer' ||
    event.entityType === 'expense' ||
    event.entityType === 'invoice'
    ? 'accounting'
    : 'user_management'
}

function compactDetailsForSearch(event: OrganizationAuditEvent): null | string {
  const details: Record<string, unknown> = {}
  if (event.changes && typeof event.changes === 'object') {
    details.changes = event.changes
  }
  if (event.metadata && typeof event.metadata === 'object') {
    details.metadata = event.metadata
  }

  return Object.keys(details).length > 0 ? JSON.stringify(details) : null
}
