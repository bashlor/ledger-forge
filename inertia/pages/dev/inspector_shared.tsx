import type { ReactNode } from 'react'

import { DataTable } from '~/components/data_table'
import { StatusBadge } from '~/components/status_badge'
import { formatCurrency, formatShortDate } from '~/lib/format'

import type {
  ActionTone,
  DevConsoleTab,
  ProbeType,
  Props,
  WorkflowActionState,
} from './inspector_types'

import { tabs } from './inspector_types'

export const labelClass =
  'text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant'

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

export function GeneratorCard({
  action,
  count,
  label,
  onCountChange,
  onRun,
  processingAction,
  readOnlyCount = false,
  summary,
}: {
  action: string
  count: string
  label: string
  onCountChange: (value: string) => void
  onRun: (action: string, extra?: Record<string, string>, tone?: ActionTone) => void
  processingAction: null | string
  readOnlyCount?: boolean
  summary: string
}) {
  return (
    <div className="rounded-2xl border border-outline-variant/12 bg-surface-container-lowest px-4 py-4 shadow-ambient-tight">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={labelClass}>Generator</p>
          <h3 className="mt-1 text-lg font-semibold text-on-surface">{label}</h3>
        </div>
        <ToneBadge label="ready" tone="neutral" />
      </div>
      <p className="mt-2 text-sm leading-6 text-on-surface-variant">{summary}</p>
      <label className="mt-3 block space-y-1.5">
        <span className={labelClass}>Count</span>
        <input
          className={inputClass()}
          disabled={readOnlyCount}
          onChange={(event) => onCountChange(event.target.value)}
          value={count}
        />
      </label>
      <button
        className={`${buttonClass()} mt-3 w-full`}
        disabled={processingAction === action}
        onClick={() => onRun(action, readOnlyCount ? {} : { count })}
        type="button"
      >
        {processingAction === action ? 'Running...' : 'Generate'}
      </button>
    </div>
  )
}

export function humanizeAuditAction(action: string) {
  return action.replaceAll('_', ' ')
}

export function inputClass() {
  return 'w-full rounded-lg border border-outline-variant/18 bg-surface-container-low px-3 py-2 text-sm text-on-surface outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary/25'
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

export function WorkflowActionPanel({
  allowUnauthorizedMode,
  copyText,
  onRun,
  probeType,
  processingAction,
  record,
  selectedPermissions,
}: {
  allowUnauthorizedMode: boolean
  copyText: (value: string) => void
  onRun: (
    action: string,
    extra?: Record<string, string>,
    tone?: ActionTone,
    confirmMessage?: string
  ) => void
  probeType: ProbeType
  processingAction: null | string
  record:
    | null
    | Props['inspector']['customers'][number]
    | Props['inspector']['expenses'][number]
    | Props['inspector']['invoices'][number]
  selectedPermissions: Props['inspector']['context']['selectedMemberPermissions']
}) {
  if (!record) {
    return (
      <CompactPanel title="Record Actions">
        <EmptyStateCopy text="Select a record from the table to inspect it and run contextual actions." />
      </CompactPanel>
    )
  }

  const actions =
    probeType === 'invoices'
      ? invoiceActionStates(record as Props['inspector']['invoices'][number], selectedPermissions)
      : probeType === 'expenses'
        ? expenseActionStates(record as Props['inspector']['expenses'][number], selectedPermissions)
        : customerActionStates(
            (record as Props['inspector']['customers'][number]).id,
            selectedPermissions
          )

  return (
    <CompactPanel title="Record Actions">
      <div className="space-y-4">
        <DetailList>
          <DetailRow label="Entity" value={probeType.slice(0, -1)} />
          <DetailRow
            label="Record id"
            value={
              <div className="flex justify-end gap-2">
                <span className="font-mono text-xs">{record.id}</span>
                <button
                  className={copyButtonClass()}
                  onClick={() => copyText(record.id)}
                  type="button"
                >
                  Copy
                </button>
              </div>
            }
          />
          {'invoiceNumber' in record ? (
            <DetailRow label="Primary" value={record.invoiceNumber} />
          ) : null}
          {'label' in record ? <DetailRow label="Primary" value={record.label} /> : null}
          {'company' in record ? <DetailRow label="Primary" value={record.company} /> : null}
        </DetailList>

        <RuleList
          rules={actions.map((action) => ({
            allowed: action.allowed,
            label: action.label,
            reason: action.reason,
          }))}
          title="Action states"
        />

        <div className="space-y-2">
          {actions.map((action) => {
            const canAttempt =
              action.allowed || (allowUnauthorizedMode && action.attemptable !== false)
            return (
              <button
                className={`${buttonClass(action.tone)} w-full justify-between`}
                disabled={!canAttempt || processingAction === action.id}
                key={action.label}
                onClick={() =>
                  onRun(
                    action.id,
                    action.extra,
                    action.tone,
                    action.tone === 'danger' ? `${action.label}?` : undefined
                  )
                }
                type="button"
              >
                <span>{processingAction === action.id ? 'Running...' : action.label}</span>
                <span className="text-xs opacity-80">
                  {action.allowed ? 'allowed' : allowUnauthorizedMode ? 'attempt' : 'blocked'}
                </span>
              </button>
            )
          })}
        </div>

        {!allowUnauthorizedMode ? (
          <div className="rounded-xl border border-outline-variant/12 bg-surface-container-low px-3 py-2.5 text-sm text-on-surface-variant">
            Enable unauthorized mode to deliberately trigger blocked paths and verify denials.
          </div>
        ) : null}
      </div>
    </CompactPanel>
  )
}

export function WorkflowRecordTable({
  customers,
  expenses,
  invoices,
  onSelectRecord,
  probeType,
  selectedCustomer,
  selectedExpense,
  selectedInvoice,
}: {
  customers: Props['inspector']['customers']
  expenses: Props['inspector']['expenses']
  invoices: Props['inspector']['invoices']
  onSelectRecord: (recordId: string) => void
  probeType: ProbeType
  selectedCustomer: null | Props['inspector']['customers'][number]
  selectedExpense: null | Props['inspector']['expenses'][number]
  selectedInvoice: null | Props['inspector']['invoices'][number]
}) {
  const title =
    probeType === 'invoices' ? 'Invoices' : probeType === 'expenses' ? 'Expenses' : 'Customers'

  return (
    <DataTable
      emptyMessage={`No ${title.toLowerCase()} available in the selected tenant.`}
      isEmpty={
        probeType === 'invoices'
          ? invoices.length === 0
          : probeType === 'expenses'
            ? expenses.length === 0
            : customers.length === 0
      }
      title={title}
    >
      <ScrollableTable maxHeightClass="max-h-[42rem]">
        {probeType === 'invoices' ? (
          <table className="w-full min-w-[820px] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-20">
              <tr className="border-b border-outline-variant/12 bg-surface-container-low text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                <th className="px-3 py-2">Invoice</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Window</th>
                <th className="px-3 py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice, index) => (
                <tr
                  className={`cursor-pointer border-b border-outline-variant/8 transition-colors hover:bg-surface-container-low/75 ${
                    selectedInvoice?.id === invoice.id
                      ? 'bg-primary/6'
                      : index % 2 === 0
                        ? 'bg-surface-container-lowest'
                        : 'bg-surface-container-lowest/70'
                  }`}
                  key={invoice.id}
                  onClick={() => onSelectRecord(invoice.id)}
                >
                  <td className="px-3 py-2.5 font-medium text-on-surface">
                    {invoice.invoiceNumber}
                  </td>
                  <td className="px-3 py-2.5 text-on-surface-variant">
                    {invoice.customerCompanyName}
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={invoice.status} />
                  </td>
                  <td className="px-3 py-2.5 text-on-surface-variant">
                    {formatShortDate(invoice.issueDate)} to {formatShortDate(invoice.dueDate)}
                  </td>
                  <td className="px-3 py-2.5 text-on-surface">
                    {formatMoney(invoice.totalInclTaxCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        {probeType === 'expenses' ? (
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-20">
              <tr className="border-b border-outline-variant/12 bg-surface-container-low text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                <th className="px-3 py-2">Expense</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense, index) => (
                <tr
                  className={`cursor-pointer border-b border-outline-variant/8 transition-colors hover:bg-surface-container-low/75 ${
                    selectedExpense?.id === expense.id
                      ? 'bg-primary/6'
                      : index % 2 === 0
                        ? 'bg-surface-container-lowest'
                        : 'bg-surface-container-lowest/70'
                  }`}
                  key={expense.id}
                  onClick={() => onSelectRecord(expense.id)}
                >
                  <td className="px-3 py-2.5 font-medium text-on-surface">{expense.label}</td>
                  <td className="px-3 py-2.5 text-on-surface-variant">{expense.category}</td>
                  <td className="px-3 py-2.5 text-on-surface-variant">
                    {formatShortDate(expense.date)}
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={expense.status} />
                  </td>
                  <td className="px-3 py-2.5 text-on-surface">
                    {formatMoney(expense.amountCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        {probeType === 'customers' ? (
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-20">
              <tr className="border-b border-outline-variant/12 bg-surface-container-low text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                <th className="px-3 py-2">Company</th>
                <th className="px-3 py-2">Contact</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer, index) => (
                <tr
                  className={`cursor-pointer border-b border-outline-variant/8 transition-colors hover:bg-surface-container-low/75 ${
                    selectedCustomer?.id === customer.id
                      ? 'bg-primary/6'
                      : index % 2 === 0
                        ? 'bg-surface-container-lowest'
                        : 'bg-surface-container-lowest/70'
                  }`}
                  key={customer.id}
                  onClick={() => onSelectRecord(customer.id)}
                >
                  <td className="px-3 py-2.5 font-medium text-on-surface">{customer.company}</td>
                  <td className="px-3 py-2.5 text-on-surface-variant">{customer.name}</td>
                  <td className="px-3 py-2.5 text-on-surface-variant">{customer.email}</td>
                  <td className="px-3 py-2.5 text-on-surface-variant">{customer.phone}</td>
                  <td className="px-3 py-2.5 text-on-surface-variant">
                    {formatTimestamp(customer.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </ScrollableTable>
    </DataTable>
  )
}

function customerActionStates(
  customerId: string,
  permissions: Props['inspector']['context']['selectedMemberPermissions']
): WorkflowActionState[] {
  return [
    {
      allowed: permissions.accountingWriteDrafts,
      extra: { customerId },
      id: 'update-customer',
      label: 'Update customer',
      reason: permissions.accountingWriteDrafts
        ? 'Draft write permission available.'
        : 'Draft write permission is missing.',
      tone: 'secondary',
    },
    {
      allowed: permissions.accountingWriteDrafts,
      extra: { customerId },
      id: 'delete-customer',
      label: 'Delete customer',
      reason: permissions.accountingWriteDrafts
        ? 'Delete path available unless invoices are linked.'
        : 'Draft write permission is missing.',
      tone: 'danger',
    },
  ]
}

function expenseActionStates(
  expense: Props['inspector']['expenses'][number],
  permissions: Props['inspector']['context']['selectedMemberPermissions']
): WorkflowActionState[] {
  return [
    {
      allowed: permissions.accountingWriteDrafts && expense.status === 'draft',
      extra: { expenseId: expense.id },
      id: 'confirm-expense',
      label: 'Confirm expense',
      reason:
        expense.status !== 'draft'
          ? 'Only draft expenses can be confirmed.'
          : permissions.accountingWriteDrafts
            ? 'Draft write permission available.'
            : 'Draft write permission is missing.',
      tone: 'primary',
    },
    {
      allowed: permissions.accountingWriteDrafts && expense.status === 'draft',
      extra: { expenseId: expense.id },
      id: 'delete-expense',
      label: 'Delete draft expense',
      reason:
        expense.status !== 'draft'
          ? 'Only draft expenses can be deleted.'
          : permissions.accountingWriteDrafts
            ? 'Draft delete path is available.'
            : 'Draft write permission is missing.',
      tone: 'danger',
    },
    {
      allowed: permissions.accountingWriteDrafts && expense.status === 'confirmed',
      extra: { expenseId: expense.id },
      id: 'delete-confirmed-expense',
      label: 'Delete confirmed expense',
      reason:
        expense.status !== 'confirmed'
          ? 'Select a confirmed expense to exercise the blocked path.'
          : permissions.accountingWriteDrafts
            ? 'Visible blocked path for confirmed delete checks.'
            : 'Draft write permission is missing.',
      tone: 'danger',
    },
  ]
}

function invoiceActionStates(
  invoice: Props['inspector']['invoices'][number],
  permissions: Props['inspector']['context']['selectedMemberPermissions']
): WorkflowActionState[] {
  return [
    {
      allowed: permissions.accountingWriteDrafts && invoice.status === 'draft',
      extra: { invoiceId: invoice.id },
      id: 'update-invoice-draft',
      label: 'Update draft',
      reason:
        invoice.status !== 'draft'
          ? 'Only draft invoices can be edited.'
          : permissions.accountingWriteDrafts
            ? 'Draft write permission available.'
            : 'Draft write permission is missing.',
      tone: 'secondary',
    },
    {
      allowed: permissions.invoiceIssue && invoice.status === 'draft',
      extra: { invoiceId: invoice.id },
      id: 'change-invoice-status',
      label: 'Send invoice',
      reason:
        invoice.status !== 'draft'
          ? 'Only draft invoices can be issued.'
          : permissions.invoiceIssue
            ? 'Issue permission available.'
            : 'Issue permission is missing.',
      tone: 'primary',
    },
    {
      allowed: permissions.invoiceMarkPaid && invoice.status === 'issued',
      extra: { invoiceId: invoice.id },
      id: 'change-invoice-status',
      label: 'Mark paid',
      reason:
        invoice.status !== 'issued'
          ? 'Only issued invoices can be marked as paid.'
          : permissions.invoiceMarkPaid
            ? 'Mark-paid permission available.'
            : 'Mark-paid permission is missing.',
      tone: 'primary',
    },
    {
      allowed: permissions.accountingWriteDrafts && invoice.status === 'draft',
      extra: { invoiceId: invoice.id },
      id: 'delete-invoice',
      label: 'Delete draft',
      reason:
        invoice.status !== 'draft'
          ? 'Only draft invoices can be deleted.'
          : permissions.accountingWriteDrafts
            ? 'Draft deletion path is available.'
            : 'Draft write permission is missing.',
      tone: 'danger',
    },
    {
      allowed: false,
      attemptable: invoice.status !== 'draft',
      extra: { invoiceId: invoice.id },
      id: 'delete-invoice',
      label: 'Delete sent invoice',
      reason:
        invoice.status === 'draft'
          ? 'Select a non-draft invoice to exercise the blocked path.'
          : 'Visible blocked path for forbidden deletion checks.',
      tone: 'danger',
    },
  ]
}
