import type { ReactNode } from 'react'

type ActionTone = 'danger' | 'primary' | 'secondary'
type BadgeTone = 'danger' | 'info' | 'neutral' | 'success' | 'warning'
type MemberRole = 'admin' | 'member' | 'owner'

/** @deprecated Prefer `<Eyebrow>` or the `eyebrow` Tailwind utility; kept for existing `className={labelClass}` call sites. */
export const labelClass = 'eyebrow'

const INPUT_BORDERED =
  'w-full rounded-xl border border-border-default bg-white px-3 py-3 text-sm text-on-surface outline-hidden transition-colors focus:border-primary disabled:cursor-not-allowed disabled:opacity-60'

export function buttonClass(tone: ActionTone = 'primary') {
  const base =
    'inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50'

  if (tone === 'secondary') {
    return `${base} border border-border-hairline bg-surface-container-highest text-on-surface hover:bg-surface-container-high`
  }

  if (tone === 'danger') {
    return `${base} bg-error text-on-primary hover:opacity-90`
  }

  return `${base} bg-primary text-on-primary shadow-sm shadow-primary/20 hover:bg-primary-dim`
}

export function inputClass() {
  return INPUT_BORDERED
}

export function RoleBadge({ role }: { role: MemberRole }) {
  return <ToneBadge label={role} tone={toneForRole(role)} />
}

export function rowActionButtonClass() {
  return 'eyebrow rounded-lg border border-border-hairline bg-surface-container-low px-3 py-1.5 transition-colors hover:bg-surface-container'
}

export function ScrollableTable({
  children,
  maxHeightClass = 'max-h-[26rem]',
}: {
  children: ReactNode
  maxHeightClass?: string
}) {
  return <div className={`overflow-auto ${maxHeightClass}`}>{children}</div>
}

export function ToneBadge({
  label,
  tone,
}: {
  label: string
  tone: BadgeTone
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${toneBadgeClass(tone)}`}
    >
      {label}
    </span>
  )
}

export function toneBadgeClass(tone: BadgeTone) {
  switch (tone) {
    case 'danger':
      return 'border-red-500/20 bg-red-500/10 text-red-700'
    case 'info':
      return 'border-sky-500/20 bg-sky-500/10 text-sky-700'
    case 'success':
      return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700'
    case 'warning':
      return 'border-amber-500/30 bg-amber-500/12 text-amber-700'
    default:
      return 'border-border-hairline bg-surface-container-low text-on-surface-variant'
  }
}

export function toneForAuditResult(result: 'denied' | 'error' | 'success') {
  switch (result) {
    case 'denied':
      return 'warning' as const
    case 'success':
      return 'success' as const
    default:
      return 'danger' as const
  }
}

function toneForRole(role: MemberRole): BadgeTone {
  switch (role) {
    case 'admin':
      return 'info'
    case 'owner':
      return 'warning'
    default:
      return 'neutral'
  }
}
