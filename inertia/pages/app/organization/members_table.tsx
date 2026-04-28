import { TableHeaderCell, TableHeadRow } from '~/components/ui'

import { MemberAvatar } from './member_avatar'
import { MemberRowActionsMenu, type OrganizationMemberRow } from './member_row_actions_menu'
import { OrganizationMemberStatusBadge } from './organization_member_status_badge'
import { OrganizationRoleBadge } from './organization_role_badge'

interface MembersTableProps {
  canManageMembershipRoles: boolean
  canToggleMembershipStatus: boolean
  items: OrganizationMemberRow[]
  patchingId: null | string
  setPatchingId: (id: null | string) => void
  viewerMembershipRole: 'admin' | 'member' | 'owner'
  viewerUserId: string
}

export function MembersTable({
  canManageMembershipRoles,
  canToggleMembershipStatus,
  items,
  patchingId,
  setPatchingId,
  viewerMembershipRole,
  viewerUserId,
}: MembersTableProps) {
  return (
    <table className="tonal-table organization-members-table w-full min-w-[880px] border-collapse text-left text-sm">
      <thead>
        <TableHeadRow className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          <TableHeaderCell>User</TableHeaderCell>
          <TableHeaderCell>Role</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell>Last active</TableHeaderCell>
          <TableHeaderCell className="w-px px-2 text-right">
            <span className="sr-only">Actions</span>
          </TableHeaderCell>
        </TableHeadRow>
      </thead>
      <tbody className="divide-y divide-slate-200/80">
        {items.map((member) => (
          <tr
            className="group transition-colors duration-150 ease-out hover:bg-slate-50 focus-within:bg-slate-50"
            key={member.id}
          >
            <td className="px-5 py-4">
              <div className="flex min-w-0 items-start gap-3">
                <MemberAvatar name={member.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-950">{member.name}</p>
                  <p className="mt-0.5 truncate text-xs leading-snug text-slate-500">{member.email}</p>
                </div>
              </div>
            </td>
            <td className="whitespace-nowrap px-5 py-4">
              <OrganizationRoleBadge role={member.role} />
            </td>
            <td className="whitespace-nowrap px-5 py-4">
              <OrganizationMemberStatusBadge isActive={member.isActive} />
            </td>
            <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500 tabular-nums">—</td>
            <td className="whitespace-nowrap px-2 py-4 text-right">
              <MemberRowActionsMenu
                canManageMembershipRoles={canManageMembershipRoles}
                canToggleMembershipStatus={canToggleMembershipStatus}
                member={member}
                patchingId={patchingId}
                setPatchingId={setPatchingId}
                viewerMembershipRole={viewerMembershipRole}
                viewerUserId={viewerUserId}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
