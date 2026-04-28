import type { ReactNode } from 'react'

import { SecondaryButton } from '~/components/button'
import { buttonClass, ToneBadge } from '~/components/operator_ui'
import { PageHeader } from '~/components/page_header'
import { Caption, Eyebrow, Panel } from '~/components/ui'

import type { ActionTone, DevConsoleTab, Props } from './inspector_types'

import { tabs } from './inspector_types'

type GlobalOperation = Props['inspector']['globalOperations'][number]

export {
  buttonClass,
  inputClass,
  labelClass,
  RoleBadge,
  rowActionButtonClass,
  ScrollableTable,
  ToneBadge,
  toneBadgeClass,
  toneForAuditResult,
} from '~/components/operator_ui'

export function CompactPanel({ children, title }: { children: ReactNode; title: string }) {
  return (
    <Panel as="section" className="overflow-hidden p-0">
      <div className="border-b border-outline-variant/10 px-4 py-3">
        <h2 className="text-base font-semibold text-on-surface">{title}</h2>
      </div>
      <div className="px-4 py-4">{children}</div>
    </Panel>
  )
}

export function copyButtonClass() {
  return 'eyebrow rounded-md border border-outline-variant/18 bg-surface-container-low px-2 py-1 transition-colors hover:bg-surface-container'
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
    <Panel as="section" className="px-4 py-4">
      <PageHeader
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <ToneBadge label={readOnlyBadge} tone="warning" />
            <div className="min-w-0 rounded-xl border border-outline-variant/15 bg-surface-container-low px-3 py-2">
              <Eyebrow>Current operator</Eyebrow>
              <p className="truncate text-sm font-semibold text-on-surface">{operatorName}</p>
              <p className="truncate text-xs text-on-surface-variant">{operatorEmail}</p>
            </div>
            <SecondaryButton onClick={onRefresh} type="button">
              Refresh
            </SecondaryButton>
          </div>
        }
        description="Inspect tenants, permissions, audit events, and demo data workflows for the local development environment."
        eyebrow="Development"
        title="Dev Console"
      />
    </Panel>
  )
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
        <Caption>{description}</Caption>
        {operations.map((operation) => {
          const tone = operation.tone === 'danger' ? 'danger' : 'secondary'
          const buttonLabel = operationButtonLabel(operation, processingAction)
          return (
            <div
              className="rounded-xl border border-outline-variant/15 bg-surface-container-low px-4 py-3"
              key={operation.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-on-surface">{operation.label}</h3>
                  <p className="mt-1.5 text-sm text-on-surface-variant">{operation.impact}</p>
                </div>
                <button
                  className={`${buttonClass(tone)} shrink-0`}
                  disabled={operationButtonDisabled(operation, processingAction)}
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
                  {buttonLabel}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </CompactPanel>
  )
}

function operationButtonDisabled(
  operation: GlobalOperation,
  processingAction: null | string
): boolean {
  return !operation.available || !operation.action || processingAction === operation.action
}

function operationButtonLabel(operation: GlobalOperation, processingAction: null | string): string {
  if (!operation.available) {
    return operation.unavailableLabel ?? 'Unavailable'
  }

  if (processingAction === operation.action) {
    return 'Running...'
  }

  return 'Run'
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

export function RuleList({
  rules,
  title,
}: {
  rules: { allowed: boolean; label: string; reason: string }[]
  title: string
}) {
  return (
    <section className="space-y-2">
      <Eyebrow>{title}</Eyebrow>
      <div className="space-y-2">
        {rules.map((rule) => (
          <div
            className="rounded-xl border border-outline-variant/15 bg-surface-container-low px-3 py-3"
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
    <nav className="sticky top-16 z-20 overflow-x-auto rounded-xl border border-outline-variant/15 bg-surface-container-lowest/95 px-2 py-1.5 shadow-ambient backdrop-blur-md">
      <div className="grid min-w-max auto-cols-fr grid-flow-col gap-2">
        {tabs.map((tab) => {
          const active = activeTab === tab.id
          return (
            <button
              className={`flex min-w-[170px] items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                active
                  ? 'bg-primary/10 text-primary ring-1 ring-primary/15'
                  : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
              }`}
              key={tab.id}
              onClick={() => onChange(tab.id)}
              type="button"
            >
              <span>{tab.label}</span>
              {counts[tab.id] !== null ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${active ? 'bg-primary/10 text-primary' : 'bg-surface-container-low text-on-surface-variant'}`}
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

