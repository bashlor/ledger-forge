import { router } from '@inertiajs/react'
import { useId, useRef, useState } from 'react'

import { AppIcon } from '~/components/app_icon'
import { useCloseOnOutsideAndEscape } from '~/hooks/use_close_on_outside_and_escape'

export interface OrganizationMemberRow {
  email: string
  id: string
  isActive: boolean
  name: string
  role: 'admin' | 'member' | 'owner'
  userId: string
}

interface MemberRowActionsMenuProps {
  canManageMembershipRoles: boolean
  canToggleMembershipStatus: boolean
  member: OrganizationMemberRow
  patchingId: null | string
  setPatchingId: (id: null | string) => void
  viewerMembershipRole: 'admin' | 'member' | 'owner'
  viewerUserId: string
}

type PatchPayload = NonNullable<Parameters<typeof router.patch>[1]>

export function MemberRowActionsMenu({
  canManageMembershipRoles,
  canToggleMembershipStatus,
  member,
  patchingId,
  setPatchingId,
  viewerMembershipRole,
  viewerUserId,
}: MemberRowActionsMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const baseId = useId()
  const menuId = `${baseId}-menu`

  useCloseOnOutsideAndEscape(menuOpen, setMenuOpen, wrapRef)

  const canChangeRole =
    canManageMembershipRoles && member.role !== 'owner' && viewerMembershipRole === 'owner'

  const canToggle =
    canToggleMembershipStatus &&
    member.role !== 'owner' &&
    member.userId !== viewerUserId &&
    (viewerMembershipRole === 'owner' ||
      (viewerMembershipRole === 'admin' && member.role === 'member'))

  const showPromoteToAdmin = canChangeRole && member.role === 'member'
  const showDemoteToMember = canChangeRole && member.role === 'admin'
  const showSuspend = canToggle && member.isActive
  const showActivate = canToggle && !member.isActive

  const hasActions = showPromoteToAdmin || showDemoteToMember || showSuspend || showActivate
  const busy = patchingId === member.id
  const anyPatch = patchingId !== null

  function runPatch(url: string, data: PatchPayload) {
    setPatchingId(member.id)
    setMenuOpen(false)
    router.patch(url, data, {
      onFinish: () => setPatchingId(null),
      preserveScroll: true,
    })
  }

  function patchToggle(nextActive: boolean) {
    runPatch(`/account/organizations/members/${member.id}`, { isActive: nextActive })
  }

  function patchRole(role: 'admin' | 'member') {
    runPatch(`/account/organizations/members/${member.id}/role`, { role })
  }

  if (!hasActions) {
    return (
      <span className="text-xs text-slate-400" title="No actions available for this membership">
        —
      </span>
    )
  }

  return (
    <div className="relative flex justify-end" ref={wrapRef}>
      <button
        aria-controls={menuOpen ? menuId : undefined}
        aria-expanded={menuOpen}
        aria-haspopup="true"
        aria-label={`Actions for ${member.name}`}
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-transparent text-slate-500 outline-hidden transition-colors duration-150 ease-out hover:border-slate-200/90 hover:bg-slate-100 hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-50 ${
          menuOpen ? 'border-slate-200 bg-slate-100 text-slate-800' : ''
        }`}
        disabled={busy || anyPatch}
        onClick={(event) => {
          event.stopPropagation()
          setMenuOpen((open) => !open)
        }}
        type="button"
      >
        <AppIcon name="more_vert" size={20} />
      </button>

      {menuOpen ? (
        <div
          className="absolute right-0 top-full z-20 mt-1 min-w-[12rem] overflow-hidden rounded-xl border border-slate-200/95 bg-white py-1 shadow-lg shadow-slate-900/12 ring-1 ring-slate-900/[0.04]"
          id={menuId}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          role="menu"
        >
          {showPromoteToAdmin ? (
            <button
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-slate-800 transition-colors duration-150 hover:bg-slate-50 disabled:opacity-50"
              disabled={busy || anyPatch}
              onClick={() => patchRole('admin')}
              role="menuitem"
              type="button"
            >
              <AppIcon className="text-slate-500" name="person_add" size={18} />
              Change role to Admin
            </button>
          ) : null}
          {showDemoteToMember ? (
            <button
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-slate-800 transition-colors duration-150 hover:bg-slate-50 disabled:opacity-50"
              disabled={busy || anyPatch}
              onClick={() => patchRole('member')}
              role="menuitem"
              type="button"
            >
              <AppIcon className="text-slate-500" name="tune" size={18} />
              Change role to Member
            </button>
          ) : null}
          {showSuspend ? (
            <button
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-amber-800 transition-colors duration-150 hover:bg-amber-50 disabled:opacity-50"
              disabled={busy || anyPatch}
              onClick={() => patchToggle(false)}
              role="menuitem"
              type="button"
            >
              <AppIcon className="text-amber-600" name="shield_lock" size={18} />
              Suspend access
            </button>
          ) : null}
          {showActivate ? (
            <button
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-emerald-800 transition-colors duration-150 hover:bg-emerald-50 disabled:opacity-50"
              disabled={busy || anyPatch}
              onClick={() => patchToggle(true)}
              role="menuitem"
              type="button"
            >
              <AppIcon className="text-emerald-600" name="task_alt" size={18} />
              Activate member
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
