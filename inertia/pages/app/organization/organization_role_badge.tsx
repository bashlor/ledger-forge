type OrgRole = 'admin' | 'member' | 'owner'

const ROLE_STYLES: Record<OrgRole, string> = {
  admin:
    'border border-violet-200/90 bg-violet-50 text-violet-900 ring-1 ring-inset ring-violet-900/8',
  member:
    'border border-slate-200/85 bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-900/6',
  owner:
    'border border-amber-200/90 bg-amber-50 text-amber-950 ring-1 ring-inset ring-amber-900/10',
}

const ROLE_LABEL: Record<OrgRole, string> = {
  admin: 'Admin',
  member: 'Member',
  owner: 'Owner',
}

export function OrganizationRoleBadge({ role }: { role: OrgRole }) {
  return (
    <span
      className={`inline-flex rounded-lg px-2.5 py-1 text-[11px] font-semibold tracking-wide ${ROLE_STYLES[role]}`}
    >
      {ROLE_LABEL[role]}
    </span>
  )
}
