import type { ReactNode } from 'react'

import type { ActionTone, DevConsoleTab, Props } from './inspector_types'

import { tabs } from './inspector_types'

export const labelClass =
  'text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant'

export function buttonClass(tone: ActionTone = 'primary') {
  const base =
    'inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50'

  if (tone === 'secondary') {
    return `${base} border border-outline-variant/18 bg-surface-container-low text-on-surface hover:bg-surface-container`
  }

  if (tone === 'danger') {
    return `${base} bg-error text-on-primary hover:opacity-90`
  }

  return `${base} milled-steel-gradient text-on-primary hover:opacity-90`
}

export function CompactPanel({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="rounded-2xl border border-outline-variant/12 bg-surface-container-lowest">
      <div className="border-b border-outline-variant/10 px-4 py-3">
        <h2 className="text-base font-semibold text-on-surface">{title}</h2>
      </div>
      <div className="px-4 py-4">{children}</div>
    </section>
  )
}

export function copyButtonClass() {
  return 'rounded-md border border-outline-variant/18 bg-surface-container-low px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-on-surface transition-colors hover:bg-surface-container'
}

export function DevConsoleHeader({
  onRefresh,
  operatorEmail,
  operatorName,
  readOnlyBadge,
}: {
  onRefresh: () => void
  operatorEmail: string
  operatorName: string
  readOnlyBadge: string
}) {
  return (
    <section className="rounded-[20px] border border-outline-variant/14 bg-surface-container-lowest px-4 py-3 shadow-ambient-tight">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-headline text-[1.75rem] font-extrabold tracking-tight text-on-surface">
          Dev Console
        </h1>
        <ToneBadge label="Development" tone="info" />
        <ToneBadge label={readOnlyBadge} tone="warning" />
        <div className="ml-auto flex min-w-0 items-center gap-3">
          <div className="min-w-0 rounded-xl border border-outline-variant/12 bg-surface-container-low px-3 py-2">
            <p className={labelClass}>Current operator</p>
            <p className="truncate text-sm font-semibold text-on-surface">{operatorName}</p>
            <p className="truncate text-xs text-on-surface-variant">{operatorEmail}</p>
          </div>
          <button className={buttonClass('secondary')} onClick={onRefresh} type="button">
            Refresh
          </button>
        </div>
      </div>
    </section>
  )
}

export function inputClass() {
  return 'w-full rounded-lg border border-outline-variant/18 bg-surface-container-low px-3 py-2 text-sm text-on-surface outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary/25'
}

export function OperationPanel({
  description,
  onRun,
  operations,
  processingAction,
  title,
}: {
  description: string
  onRun: (
    action: string,
    extra?: Record<string, string>,
    tone?: ActionTone,
    confirmMessage?: string
  ) => void
  operations: Props['inspector']['globalOperations']
  processingAction: null | string
  title: string
}) {
  return (
    <CompactPanel title={title}>
      <div className="space-y-2">
        <p className="text-sm text-on-surface-variant">{description}</p>
        {operations.map((operation) => {
          const tone = operation.tone === 'danger' ? 'danger' : 'secondary'
          return (
            <div
              className="rounded-xl border border-outline-variant/12 bg-surface-container-low px-4 py-3"
              key={operation.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-on-surface">{operation.label}</h3>
                  <p className="mt-1.5 text-sm text-on-surface-variant">{operation.impact}</p>
                </div>
                <button
                  className={`${buttonClass(tone)} shrink-0`}
                  disabled={
                    !operation.available ||
                    !operation.action ||
                    processingAction === operation.action
                  }
                  onClick={() =>
                    operation.action &&
                    onRun(
                      operation.action,
                      {},
                      tone,
                      operation.tone === 'danger' ? `${operation.label}?` : undefined
                    )
                  }
                  type="button"
                >
                  {!operation.available
                    ? (operation.unavailableLabel ?? 'Unavailable')
                    : processingAction === operation.action
                      ? 'Running...'
                      : 'Run'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </CompactPanel>
  )
}

export function PermissionChip({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
        active
          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700'
          : 'border-outline-variant/20 bg-surface-container-low text-on-surface-variant'
      }`}
    >
      {label}
    </span>
  )
}

export function RoleBadge({ role }: { role: 'admin' | 'member' | 'owner' }) {
  const tone = role === 'owner' ? 'warning' : role === 'admin' ? 'info' : 'neutral'
  return <ToneBadge label={role} tone={tone} />
}

export function rowActionButtonClass() {
  return 'rounded-lg border border-outline-variant/18 bg-surface-container-low px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface transition-colors hover:bg-surface-container'
}

export function RuleList({
  rules,
  title,
}: {
  rules: { allowed: boolean; label: string; reason: string }[]
  title: string
}) {
  return (
    <section className="space-y-2">
      <p className={labelClass}>{title}</p>
      <div className="space-y-2">
        {rules.map((rule) => (
          <div
            className="rounded-xl border border-outline-variant/12 bg-surface-container-low px-3 py-3"
            key={rule.label}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-on-surface">{rule.label}</p>
              <ToneBadge
                label={rule.allowed ? 'allowed' : 'blocked'}
                tone={rule.allowed ? 'success' : 'warning'}
              />
            </div>
            <p className="mt-2 text-sm text-on-surface-variant">{rule.reason}</p>
          </div>
        ))}
      </div>
    </section>
  )
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

export function StickyTabs({
  activeTab,
  counts,
  onChange,
}: {
  activeTab: DevConsoleTab
  counts: Record<DevConsoleTab, null | number>
  onChange: (tab: DevConsoleTab) => void
}) {
  return (
    <nav className="sticky top-16 z-20 overflow-x-auto rounded-[18px] border border-outline-variant/12 bg-surface-container-lowest/95 px-2 py-1.5 shadow-ambient backdrop-blur-md">
      <div className="grid min-w-max grid-flow-col gap-2 auto-cols-fr">
        {tabs.map((tab) => {
          const active = activeTab === tab.id
          return (
            <button
              className={`flex min-w-[170px] items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                active
                  ? 'bg-on-surface text-background'
                  : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
              }`}
              key={tab.id}
              onClick={() => onChange(tab.id)}
              type="button"
            >
              <span>{tab.label}</span>
              {counts[tab.id] !== null ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${active ? 'bg-background/15 text-background' : 'bg-surface-container-low text-on-surface-variant'}`}
                >
                  {counts[tab.id]}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export function ToneBadge({
  label,
  tone,
}: {
  label: string
  tone: 'danger' | 'info' | 'neutral' | 'success' | 'warning'
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${toneBadgeClass(tone)}`}
    >
      {label}
    </span>
  )
}

export function toneBadgeClass(tone: 'danger' | 'info' | 'neutral' | 'success' | 'warning') {
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
      return 'border-outline-variant/20 bg-surface-container-low text-on-surface-variant'
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
