export function OrganizationMemberStatusBadge({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return (
      <span className="inline-flex rounded-lg border border-emerald-200/80 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-emerald-800 ring-1 ring-inset ring-emerald-900/5">
        Confirmed
      </span>
    )
  }

  return (
    <span className="inline-flex rounded-lg border border-red-200/85 bg-red-50 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-red-900 ring-1 ring-inset ring-red-900/8">
      Suspended
    </span>
  )
}
