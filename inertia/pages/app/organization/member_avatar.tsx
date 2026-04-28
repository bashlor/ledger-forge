import { getInitials } from '~/lib/format'

export function MemberAvatar({ name }: { name: string }) {
  const initials = getInitials(name.trim() || '?')

  return (
    <span
      aria-hidden
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200/95 bg-gradient-to-br from-slate-50 to-white text-[11px] font-bold uppercase tracking-wide text-slate-700 shadow-sm ring-1 ring-slate-900/[0.04]"
    >
      {initials.slice(0, 2)}
    </span>
  )
}
