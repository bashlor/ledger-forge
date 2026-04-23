import type { ReactNode } from 'react'

import { formatCurrency } from '~/lib/format'

import { labelClass, ToneBadge } from './inspector_ui_primitives'

export function ActivityList({
  items,
}: {
  items: {
    id: string
    label: string
    meta: string
    tone: 'danger' | 'info' | 'neutral' | 'success' | 'warning'
    toneLabel: string
  }[]
}) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          className="flex items-start justify-between gap-3 rounded-xl border border-outline-variant/12 bg-surface-container-low px-3 py-2.5"
          key={item.id}
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-on-surface">{item.label}</p>
            <p className="text-xs text-on-surface-variant">{item.meta}</p>
          </div>
          <ToneBadge label={item.toneLabel} tone={item.tone} />
        </div>
      ))}
    </div>
  )
}

export function DetailList({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant/12 bg-surface-container-low">
      {children}
    </div>
  )
}

export function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)] gap-4 border-b border-outline-variant/10 px-3 py-2.5 last:border-b-0">
      <div className={labelClass}>{label}</div>
      <div className="text-right text-sm font-medium text-on-surface">{value}</div>
    </div>
  )
}

export function EmptyStateCopy({ text }: { text: string }) {
  return <p className="text-sm text-on-surface-variant">{text}</p>
}

export function formatMoney(amountCents: number) {
  return formatCurrency(amountCents / 100)
}

export function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function humanizeAuditAction(action: string) {
  return action.replaceAll('_', ' ')
}

export function JsonPreview({ title, value }: { title: string; value: unknown }) {
  return (
    <section className="overflow-hidden rounded-xl border border-outline-variant/12 bg-surface-container-low">
      <div className="border-b border-outline-variant/10 px-3 py-2">
        <p className={labelClass}>{title}</p>
      </div>
      <pre className="overflow-x-auto px-3 py-3 text-xs leading-6 text-on-surface">
        {JSON.stringify(value, null, 2)}
      </pre>
    </section>
  )
}

export function MetricCard({
  hint,
  isWarning = false,
  label,
  onClick,
  value,
}: {
  hint: string
  isWarning?: boolean
  label: string
  onClick: () => void
  value: number
}) {
  return (
    <button
      className={`rounded-xl border px-3 py-3 text-left transition-colors ${
        isWarning
          ? 'border-amber-500/25 bg-amber-500/8 hover:bg-amber-500/12'
          : 'border-outline-variant/12 bg-surface-container-low hover:bg-surface-container'
      }`}
      onClick={onClick}
      type="button"
    >
      <p className={labelClass}>{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="text-2xl font-extrabold tabular-nums text-on-surface">{value}</p>
        <p className="text-right text-xs text-on-surface-variant">{hint}</p>
      </div>
    </button>
  )
}
