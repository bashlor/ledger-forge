import type { ReactNode } from 'react'

import { Link } from '@adonisjs/inertia/react'
import { Head, router } from '@inertiajs/react'
import { startTransition, useDeferredValue, useState } from 'react'

import { DataTable } from '~/components/data_table'
import { DrawerPanel } from '~/components/drawer_panel'
import { Modal } from '~/components/modal'
import { StatusBadge } from '~/components/status_badge'
import { formatCurrency, formatShortDate } from '~/lib/format'

import type { InertiaProps } from '../../types'

type ActionTone = 'danger' | 'primary' | 'secondary'
type DevConsoleTab =
  | 'audit-trail'
  | 'data-generator'
  | 'members-permissions'
  | 'overview'
  | 'tenant-factory'
  | 'workflow-probes'

type DialogState = null | { id: string; kind: 'expense' } | { id: string; kind: 'invoice' }

type Props = InertiaProps<{
  inspector: {
    audit: {
      actors: { id: string; label: string }[]
      events: {
        action: string
        actorEmail: null | string
        actorId: null | string
        actorName: null | string
        entityId: string
        entityType: string
        id: string
        organizationId: string
        organizationName: string
        result: 'denied' | 'error' | 'success'
        timestamp: string
      }[]
      filters: {
        action: string
        actorId: string
        tenantId: string
      }
      tenants: { id: string; label: string }[]
    }
    context: {
      accessMode: 'read_only'
      currentRole: 'admin' | 'member' | 'owner' | null
      environment: 'development'
      operator: {
        email: string
        membershipRole: 'admin' | 'member' | 'owner' | null
        name: string
        publicId: string
      }
      readOnlyBadge: string
      scenario: {
        actorId: string
        actorName: string
        actorRole: 'admin' | 'member' | 'owner' | null
        tenantId: string
        tenantName: string
        tenantSlug: string
      }
      selectedMemberId: string
      selectedMemberPermissions: {
        accountingRead: boolean
        accountingWriteDrafts: boolean
        auditTrailView: boolean
        invoiceIssue: boolean
        invoiceMarkPaid: boolean
        membershipChangeRole: boolean
        membershipList: boolean
        membershipToggleActive: boolean
      }
      selectedTenantId: string
      sessionTenant: {
        id: string
        name: string
        slug: string
      }
    }
    customers: {
      company: string
      createdAt: string
      email: string
      id: string
      name: string
      phone: string
    }[]
    expenses: {
      amountCents: number
      category: string
      createdAt: string
      date: string
      id: string
      label: string
      status: 'confirmed' | 'draft'
    }[]
    globalOperations: {
      action: null | string
      available: boolean
      id: string
      impact: string
      label: string
      section: 'danger_zone' | 'tenant_factory'
      tone: 'danger' | 'neutral'
    }[]
    invoices: {
      createdAt: string
      customerCompanyName: string
      dueDate: string
      id: string
      invoiceNumber: string
      issueDate: string
      status: 'draft' | 'issued' | 'paid'
      totalInclTaxCents: number
    }[]
    members: {
      email: string
      id: string
      isActive: boolean
      isCurrentActor: boolean
      name: string
      role: 'admin' | 'member' | 'owner'
      userId: string
    }[]
    memberships: {
      id: string
      isActive: boolean
      isCurrent: boolean
      organizationId: string
      organizationName: string
      organizationSlug: string
      permissions: {
        accountingRead: boolean
        accountingWriteDrafts: boolean
        auditTrailView: boolean
        invoiceIssue: boolean
        invoiceMarkPaid: boolean
        membershipChangeRole: boolean
        membershipList: boolean
        membershipToggleActive: boolean
      }
      role: 'admin' | 'member' | 'owner'
    }[]
    metrics: {
      auditEvents: number
      customers: number
      expenses: number
      invoices: number
      members: number
    }
    recentActions: {
      action: string
      id: string
      result: 'denied' | 'error' | 'success'
      timestamp: string
    }[]
    view: {
      activeTab: DevConsoleTab
    }
  }
}>

const tabs: { id: DevConsoleTab; label: string; shortLabel: string }[] = [
  { id: 'overview', label: 'Overview', shortLabel: 'Overview' },
  { id: 'tenant-factory', label: 'Tenant Factory', shortLabel: 'Factory' },
  { id: 'members-permissions', label: 'Members & Permissions', shortLabel: 'Members' },
  { id: 'data-generator', label: 'Data Generator', shortLabel: 'Generator' },
  { id: 'workflow-probes', label: 'Workflow Probes', shortLabel: 'Probes' },
  { id: 'audit-trail', label: 'Audit Trail', shortLabel: 'Audit' },
] as const

export default function DevInspectorPage({ inspector }: Props) {
  const [processingAction, setProcessingAction] = useState<null | string>(null)
  const [dialogState, setDialogState] = useState<DialogState>(null)
  const [selectedMemberId, setSelectedMemberId] = useState<null | string>(null)
  const [memberSearch, setMemberSearch] = useState('')
  const [memberRoleFilter, setMemberRoleFilter] = useState<'admin' | 'all' | 'member' | 'owner'>(
    'all'
  )
  const [memberStatusFilter, setMemberStatusFilter] = useState<'active' | 'all' | 'inactive'>('all')
  const [generatorActorId, setGeneratorActorId] = useState(inspector.context.selectedMemberId)
  const [invoiceBatchCount, setInvoiceBatchCount] = useState('12')
  const [expenseBatchCount, setExpenseBatchCount] = useState('8')
  const [customerBatchCount, setCustomerBatchCount] = useState('6')
  const [allowUnauthorizedMode, setAllowUnauthorizedMode] = useState(false)
  const deferredSearch = useDeferredValue(memberSearch)
  const {
    audit,
    context,
    customers,
    expenses,
    globalOperations,
    invoices,
    members,
    memberships,
    metrics,
    recentActions,
    view,
  } = inspector
  const selectedMembership = memberships.find(
    (membership) => membership.organizationId === context.selectedTenantId
  )
  const selectedMember = selectedMemberId
    ? (members.find((member) => member.id === selectedMemberId) ?? null)
    : null
  const activeInvoice =
    dialogState?.kind === 'invoice'
      ? (invoices.find((invoice) => invoice.id === dialogState.id) ?? null)
      : null
  const activeExpense =
    dialogState?.kind === 'expense'
      ? (expenses.find((expense) => expense.id === dialogState.id) ?? null)
      : null
  const tenantFactoryOps = globalOperations.filter(
    (operation) => operation.section === 'tenant_factory'
  )
  const dangerOps = globalOperations.filter((operation) => operation.section === 'danger_zone')
  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      !deferredSearch.trim() ||
      `${member.name} ${member.email} ${member.userId}`
        .toLowerCase()
        .includes(deferredSearch.trim().toLowerCase())
    const matchesRole = memberRoleFilter === 'all' || member.role === memberRoleFilter
    const matchesStatus =
      memberStatusFilter === 'all' ||
      (memberStatusFilter === 'active' ? member.isActive : !member.isActive)

    return matchesSearch && matchesRole && matchesStatus
  })

  function baseSelection() {
    return {
      memberId: context.selectedMemberId,
      tab: view.activeTab,
      tenantId: context.selectedTenantId,
    }
  }

  function auditQuery() {
    return {
      ...(audit.filters.action ? { action: audit.filters.action } : {}),
      ...(audit.filters.actorId ? { actorId: audit.filters.actorId } : {}),
      ...(audit.filters.tenantId ? { tenantId: audit.filters.tenantId } : {}),
      ...baseSelection(),
    }
  }

  function refreshSelection(next: Record<string, string> = {}) {
    router.get(
      '/_dev/inspector',
      {
        ...auditQuery(),
        ...next,
      },
      {
        preserveScroll: true,
        preserveState: true,
        replace: true,
      }
    )
  }

  function setActiveTab(tab: DevConsoleTab) {
    startTransition(() => {
      router.get(
        '/_dev/inspector',
        {
          ...auditQuery(),
          tab,
        },
        {
          preserveScroll: true,
          preserveState: true,
          replace: true,
        }
      )
    })
  }

  function runAction(
    action: string,
    extra: Record<string, string> = {},
    tone: ActionTone = 'primary'
  ) {
    setProcessingAction(action)
    router.post(
      `/_dev/inspector/actions/${action}`,
      {
        ...auditQuery(),
        ...extra,
      } as never,
      {
        onFinish: () => setProcessingAction(null),
        preserveScroll: true,
        preserveState: tone !== 'danger',
      }
    )
  }

  function switchTenant(tenantId: string) {
    setProcessingAction(`switch:${tenantId}`)
    router.post(
      '/_dev/inspector/active-tenant',
      {
        ...auditQuery(),
        tenantId,
      } as never,
      {
        onFinish: () => setProcessingAction(null),
        preserveScroll: true,
      }
    )
  }

  return (
    <>
      <Head title="Dev Console" />

      <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-4">
        <DevConsoleHeader
          onRefresh={() => refreshSelection()}
          operatorEmail={context.operator.email}
          operatorName={context.operator.name}
          readOnlyBadge={context.readOnlyBadge}
        />

        <StickyTabs activeTab={view.activeTab} onChange={setActiveTab} />

        {view.activeTab === 'overview' ? (
          <OverviewTab
            context={context}
            memberships={memberships}
            metrics={metrics}
            processingAction={processingAction}
            recentActions={recentActions}
            selectedMembership={selectedMembership}
            switchTenant={switchTenant}
          />
        ) : null}

        {view.activeTab === 'tenant-factory' ? (
          <TenantFactoryTab
            dangerOps={dangerOps}
            memberships={memberships}
            onRun={runAction}
            onSelectTenant={(tenantId) => refreshSelection({ memberId: '', tenantId })}
            processingAction={processingAction}
            selectedTenantId={context.selectedTenantId}
            tenantFactoryOps={tenantFactoryOps}
          />
        ) : null}

        {view.activeTab === 'members-permissions' ? (
          <MembersTab
            filteredMembers={filteredMembers}
            memberRoleFilter={memberRoleFilter}
            memberSearch={memberSearch}
            memberStatusFilter={memberStatusFilter}
            onMemberClick={setSelectedMemberId}
            onRoleFilterChange={setMemberRoleFilter}
            onSearchChange={setMemberSearch}
            onStatusFilterChange={setMemberStatusFilter}
            recentActions={recentActions}
            scenarioTenantName={context.scenario.tenantName}
          />
        ) : null}

        {view.activeTab === 'data-generator' ? (
          <DataGeneratorTab
            actorId={generatorActorId}
            allowUnauthorizedMode={allowUnauthorizedMode}
            customerBatchCount={customerBatchCount}
            expenseBatchCount={expenseBatchCount}
            invoiceBatchCount={invoiceBatchCount}
            members={members}
            onActorChange={setGeneratorActorId}
            onAllowUnauthorizedModeChange={setAllowUnauthorizedMode}
            onCustomerBatchCountChange={setCustomerBatchCount}
            onExpenseBatchCountChange={setExpenseBatchCount}
            onInvoiceBatchCountChange={setInvoiceBatchCount}
            onRun={runAction}
            processingAction={processingAction}
          />
        ) : null}

        {view.activeTab === 'workflow-probes' ? (
          <WorkflowProbesTab
            customers={customers}
            expenses={expenses}
            invoices={invoices}
            onOpenExpense={(id) => setDialogState({ id, kind: 'expense' })}
            onOpenInvoice={(id) => setDialogState({ id, kind: 'invoice' })}
          />
        ) : null}

        {view.activeTab === 'audit-trail' ? (
          <AuditTrailTab audit={audit} baseSelection={baseSelection} />
        ) : null}

        <MemberDrawer
          member={selectedMember}
          onClose={() => setSelectedMemberId(null)}
          onRun={runAction}
          onSetScenarioActor={(memberId) => {
            setSelectedMemberId(null)
            refreshSelection({ memberId })
          }}
          processingAction={processingAction}
          scenarioActorId={context.selectedMemberId}
          scenarioTenantName={context.scenario.tenantName}
        />

        <InvoiceProbeModal
          invoice={activeInvoice}
          onClose={() => setDialogState(null)}
          onRun={runAction}
          processingAction={processingAction}
        />
        <ExpenseProbeModal
          expense={activeExpense}
          onClose={() => setDialogState(null)}
          onRun={runAction}
          processingAction={processingAction}
        />
      </div>
    </>
  )
}

function AuditTrailTab({
  audit,
  baseSelection,
}: {
  audit: Props['inspector']['audit']
  baseSelection: () => Record<string, string>
}) {
  return (
    <DataTable
      emptyMessage="No audit events match the current filters."
      headerContent={
        <form
          className="grid gap-2 lg:grid-cols-[1fr_1fr_1fr_auto]"
          onSubmit={(event) => {
            event.preventDefault()
            const formData = new FormData(event.currentTarget)
            router.get(
              '/_dev/inspector',
              {
                ...baseSelection(),
                action: String(formData.get('action') ?? ''),
                actorId: String(formData.get('actorId') ?? ''),
                tenantId: String(formData.get('tenantId') ?? ''),
              },
              {
                preserveScroll: true,
                preserveState: true,
                replace: true,
              }
            )
          }}
        >
          <input
            className={inputClass()}
            defaultValue={audit.filters.action}
            name="action"
            placeholder="Filter action"
          />
          <select className={inputClass()} defaultValue={audit.filters.actorId} name="actorId">
            <option value="">All actors</option>
            {audit.actors.map((actor) => (
              <option key={actor.id} value={actor.id}>
                {actor.label}
              </option>
            ))}
          </select>
          <select className={inputClass()} defaultValue={audit.filters.tenantId} name="tenantId">
            {audit.tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.label}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button className={buttonClass()} type="submit">
              Apply
            </button>
            <button
              className={buttonClass('secondary')}
              onClick={() =>
                router.get('/_dev/inspector', baseSelection(), {
                  preserveScroll: true,
                  replace: true,
                })
              }
              type="button"
            >
              Reset
            </button>
          </div>
        </form>
      }
      isEmpty={audit.events.length === 0}
      title="Audit Trail"
    >
      <ScrollableTable maxHeightClass="max-h-[32rem]">
        <table className="w-full min-w-[980px] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-outline-variant/15 bg-surface-container-low text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
              <th className="px-4 py-2.5">Timestamp</th>
              <th className="px-4 py-2.5">Actor</th>
              <th className="px-4 py-2.5">Tenant</th>
              <th className="px-4 py-2.5">Action</th>
              <th className="px-4 py-2.5">Entity</th>
              <th className="px-4 py-2.5">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {audit.events.map((event) => (
              <tr key={event.id}>
                <td className="whitespace-nowrap px-4 py-3 text-on-surface-variant">
                  {formatTimestamp(event.timestamp)}
                </td>
                <td className="px-4 py-3 text-on-surface">
                  {event.actorName || event.actorEmail || event.actorId || 'system'}
                </td>
                <td className="px-4 py-3 text-on-surface-variant">{event.organizationName}</td>
                <td className="px-4 py-3 font-medium text-on-surface">
                  {humanizeAuditAction(event.action)}
                </td>
                <td className="px-4 py-3 text-on-surface-variant">
                  {event.entityType}:{event.entityId}
                </td>
                <td className="px-4 py-3">
                  <ToneBadge label={event.result} tone={toneForAuditResult(event.result)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollableTable>
    </DataTable>
  )
}

function buttonClass(tone: ActionTone = 'primary') {
  const base =
    'inline-flex items-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50'

  if (tone === 'secondary') {
    return `${base} border border-outline-variant/20 bg-surface-container-low text-on-surface hover:bg-surface-container`
  }

  if (tone === 'danger') {
    return `${base} bg-error text-on-primary hover:opacity-90`
  }

  return `${base} milled-steel-gradient text-on-primary hover:opacity-90`
}

function CompatibilityBlock({ items, title }: { items: string[]; title: string }) {
  return (
    <section className="rounded-2xl border border-outline-variant/15 bg-surface-container-low px-4 py-4">
      <h3 className="text-base font-semibold text-on-surface">{title}</h3>
      <ul className="mt-3 space-y-3 text-sm leading-6 text-on-surface-variant">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  )
}

function DataGeneratorTab({
  actorId,
  allowUnauthorizedMode,
  customerBatchCount,
  expenseBatchCount,
  invoiceBatchCount,
  members,
  onActorChange,
  onAllowUnauthorizedModeChange,
  onCustomerBatchCountChange,
  onExpenseBatchCountChange,
  onInvoiceBatchCountChange,
  onRun,
  processingAction,
}: {
  actorId: string
  allowUnauthorizedMode: boolean
  customerBatchCount: string
  expenseBatchCount: string
  invoiceBatchCount: string
  members: Props['inspector']['members']
  onActorChange: (value: string) => void
  onAllowUnauthorizedModeChange: (value: boolean) => void
  onCustomerBatchCountChange: (value: string) => void
  onExpenseBatchCountChange: (value: string) => void
  onInvoiceBatchCountChange: (value: string) => void
  onRun: (action: string, extra?: Record<string, string>, tone?: ActionTone) => void
  processingAction: null | string
}) {
  return (
    <div className="space-y-4">
      <TabPanel
        description="Keep generation controls compact. The advanced parameter UI is now isolated from runtime probes."
        title="Data Generator"
      >
        <div className="grid gap-3 lg:grid-cols-[220px_220px_auto]">
          <label className="space-y-2">
            <span className={labelClass}>Actor</span>
            <select
              className={inputClass()}
              onChange={(e) => onActorChange(e.target.value)}
              value={actorId}
            >
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} ({member.role})
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Unauthorized mode</span>
            <button
              className={`${buttonClass('secondary')} w-full justify-center`}
              onClick={() => onAllowUnauthorizedModeChange(!allowUnauthorizedMode)}
              type="button"
            >
              {allowUnauthorizedMode ? 'Enabled' : 'Disabled'}
            </button>
          </label>
          <div className="rounded-2xl border border-outline-variant/12 bg-surface-container-low px-3 py-3 text-sm text-on-surface-variant">
            Advanced controls are visually separated now. Backend parameterization follows in the
            next slice.
          </div>
        </div>
      </TabPanel>

      <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-4">
        <GeneratorCard
          action="create-invoice-test"
          count={invoiceBatchCount}
          description="Draft-first invoice batch for workflow and permission checks."
          label="Invoice batch"
          onCountChange={onInvoiceBatchCountChange}
          onRun={onRun}
          processingAction={processingAction}
        />
        <GeneratorCard
          action="create-expense-test"
          count={expenseBatchCount}
          description="Expense set with varied categories and statuses."
          label="Expense batch"
          onCountChange={onExpenseBatchCountChange}
          onRun={onRun}
          processingAction={processingAction}
        />
        <GeneratorCard
          action="create-customer-batch"
          count={customerBatchCount}
          description="Customer records to support seeded draft and send flows."
          label="Customer batch"
          onCountChange={onCustomerBatchCountChange}
          onRun={onRun}
          processingAction={processingAction}
        />
        <GeneratorCard
          action="generate-demo-data"
          count="Full"
          description="Broad seeded dataset for richer end-to-end manual scenarios."
          label="Generate full dataset"
          onCountChange={() => undefined}
          onRun={onRun}
          processingAction={processingAction}
          readOnlyCount
        />
      </div>
    </div>
  )
}

function DetailList({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-outline-variant/15 bg-surface-container-low">
      {children}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)] gap-4 border-b border-outline-variant/10 px-4 py-4 last:border-b-0">
      <div className={labelClass}>{label}</div>
      <div className="text-right text-sm font-medium text-on-surface">{value}</div>
    </div>
  )
}

function DevConsoleHeader({
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
    <section className="rounded-[22px] border border-outline-variant/18 bg-surface-container-lowest px-4 py-4 shadow-ambient-tight">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-headline text-[2rem] font-extrabold tracking-tight text-on-surface">
              Dev Console
            </h1>
            <ToneBadge label="Development" tone="info" />
            <ToneBadge label={readOnlyBadge} tone="warning" />
          </div>
          <p className="mt-2 text-sm text-on-surface-variant">
            Structured internal console for manual business-rule and isolation checks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <HeaderTile label="Current operator" secondary={operatorEmail} value={operatorName} />
          <HeaderTile label="Search shortcut" value="Cmd/Ctrl + K" />
          <HeaderTile label="Date" value={formatLongDate(new Date().toISOString())} />
          <button className={buttonClass('secondary')} onClick={onRefresh} type="button">
            Refresh
          </button>
          <Link className={buttonClass('secondary')} href="/dashboard">
            Open workspace
          </Link>
        </div>
      </div>
    </section>
  )
}

function EmptyStateCopy({ text }: { text: string }) {
  return <p className="text-sm leading-6 text-on-surface-variant">{text}</p>
}

function ExpenseProbeModal({
  expense,
  onClose,
  onRun,
  processingAction,
}: {
  expense: null | Props['inspector']['expenses'][number]
  onClose: () => void
  onRun: (action: string, extra?: Record<string, string>, tone?: ActionTone) => void
  processingAction: null | string
}) {
  return (
    <Modal
      description="Expense probes stay compact and intentionally explicit for draft vs confirmed deletion paths."
      footer={
        expense ? (
          <>
            <button className={buttonClass('secondary')} onClick={onClose} type="button">
              Close
            </button>
            <button
              className={buttonClass('danger')}
              disabled={
                processingAction === 'delete-confirmed-expense' ||
                processingAction === 'delete-expense'
              }
              onClick={() =>
                onRun(
                  expense.status === 'confirmed' ? 'delete-confirmed-expense' : 'delete-expense',
                  { expenseId: expense.id },
                  'danger'
                )
              }
              type="button"
            >
              {processingAction === 'delete-confirmed-expense' ||
              processingAction === 'delete-expense'
                ? 'Running...'
                : expense.status === 'confirmed'
                  ? 'Attempt delete confirmed expense'
                  : 'Delete draft expense'}
            </button>
          </>
        ) : undefined
      }
      onClose={onClose}
      open={Boolean(expense)}
      size="md"
      title={expense ? expense.label : 'Expense probe'}
    >
      {expense ? (
        <div className="space-y-4">
          <DetailList>
            <DetailRow label="Category" value={expense.category} />
            <DetailRow label="Status" value={expense.status} />
            <DetailRow label="Date" value={formatShortDate(expense.date)} />
            <DetailRow label="Amount" value={formatMoney(expense.amountCents)} />
          </DetailList>
          <CompatibilityBlock
            items={
              expense.status === 'draft'
                ? [
                    'Draft expense deletion is expected to succeed when draft-write permissions exist.',
                    'Denied responses here should come from permissions or isolation, not record state.',
                  ]
                : [
                    'Confirmed expense deletion should remain visible and fail explicitly.',
                    'This is a deliberate forbidden path worth keeping in tooling.',
                  ]
            }
            title="Probe notes"
          />
        </div>
      ) : null}
    </Modal>
  )
}

function formatLongDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))
}

function formatMoney(amountCents: number) {
  return formatCurrency(amountCents / 100)
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function GeneratorCard({
  action,
  count,
  description,
  label,
  onCountChange,
  onRun,
  processingAction,
  readOnlyCount = false,
}: {
  action: string
  count: string
  description: string
  label: string
  onCountChange: (value: string) => void
  onRun: (action: string, extra?: Record<string, string>, tone?: ActionTone) => void
  processingAction: null | string
  readOnlyCount?: boolean
}) {
  return (
    <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest px-4 py-4 shadow-ambient-tight">
      <p className={labelClass}>Generator</p>
      <h3 className="mt-2 text-lg font-semibold text-on-surface">{label}</h3>
      <p className="mt-2 text-sm leading-6 text-on-surface-variant">{description}</p>
      <label className="mt-4 block space-y-2">
        <span className={labelClass}>Count</span>
        <input
          className={inputClass()}
          disabled={readOnlyCount}
          onChange={(event) => onCountChange(event.target.value)}
          value={count}
        />
      </label>
      <button
        className={`${buttonClass()} mt-4 w-full justify-center`}
        disabled={processingAction === action}
        onClick={() => onRun(action)}
        type="button"
      >
        {processingAction === action ? 'Running...' : 'Generate'}
      </button>
    </div>
  )
}

function HeaderTile({
  label,
  secondary,
  value,
}: {
  label: string
  secondary?: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-low px-4 py-3">
      <p className={labelClass}>{label}</p>
      <p className="mt-1 text-sm font-semibold text-on-surface">{value}</p>
      {secondary ? <p className="truncate text-xs text-on-surface-variant">{secondary}</p> : null}
    </div>
  )
}

function humanizeAuditAction(action: string) {
  return action.replaceAll('_', ' ')
}

function inputClass() {
  return 'w-full rounded-xl border border-outline-variant/20 bg-surface-container-low px-3 py-2.5 text-sm text-on-surface outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary/30'
}

function InvoiceProbeModal({
  invoice,
  onClose,
  onRun,
  processingAction,
}: {
  invoice: null | Props['inspector']['invoices'][number]
  onClose: () => void
  onRun: (action: string, extra?: Record<string, string>, tone?: ActionTone) => void
  processingAction: null | string
}) {
  return (
    <Modal
      description="Invoice probes remain centralized inside the workflow tab and keep forbidden operations visible."
      footer={
        invoice ? (
          <>
            <button className={buttonClass('secondary')} onClick={onClose} type="button">
              Close
            </button>
            <button
              className={buttonClass('secondary')}
              disabled={processingAction === 'update-invoice-draft'}
              onClick={() => onRun('update-invoice-draft', { invoiceId: invoice.id })}
              type="button"
            >
              {processingAction === 'update-invoice-draft' ? 'Running...' : 'Edit draft'}
            </button>
            <button
              className={buttonClass()}
              disabled={processingAction === 'change-invoice-status'}
              onClick={() => onRun('change-invoice-status', { invoiceId: invoice.id })}
              type="button"
            >
              {processingAction === 'change-invoice-status'
                ? 'Running...'
                : invoice.status === 'draft'
                  ? 'Issue invoice'
                  : invoice.status === 'issued'
                    ? 'Mark paid'
                    : 'Advance status'}
            </button>
            <button
              className={buttonClass('danger')}
              disabled={processingAction === 'delete-invoice'}
              onClick={() => onRun('delete-invoice', { invoiceId: invoice.id }, 'danger')}
              type="button"
            >
              {processingAction === 'delete-invoice' ? 'Running...' : 'Delete as draft'}
            </button>
          </>
        ) : undefined
      }
      onClose={onClose}
      open={Boolean(invoice)}
      size="lg"
      title={invoice ? invoice.invoiceNumber : 'Invoice probe'}
    >
      {invoice ? (
        <div className="space-y-4">
          <DetailList>
            <DetailRow label="Customer" value={invoice.customerCompanyName} />
            <DetailRow label="Status" value={invoice.status} />
            <DetailRow
              label="Date window"
              value={`${formatShortDate(invoice.issueDate)} to ${formatShortDate(invoice.dueDate)}`}
            />
            <DetailRow label="Total" value={formatMoney(invoice.totalInclTaxCents)} />
          </DetailList>
          <CompatibilityBlock
            items={
              invoice.status === 'draft'
                ? [
                    'Draft invoices support edit, issue, and delete as the normal probe path.',
                    'Forbidden issue attempts should remain visible rather than hidden.',
                  ]
                : invoice.status === 'issued'
                  ? [
                      'Issued invoices can advance to paid when the selected actor is allowed.',
                      'Delete-as-draft should fail visibly because the document left draft state.',
                    ]
                  : [
                      'Paid invoices are terminal and draft-only actions should fail.',
                      'Keeping them visible helps verify business-rule denials quickly.',
                    ]
            }
            title="Probe notes"
          />
        </div>
      ) : null}
    </Modal>
  )
}

function MemberDrawer({
  member,
  onClose,
  onRun,
  onSetScenarioActor,
  processingAction,
  scenarioActorId,
  scenarioTenantName,
}: {
  member: null | Props['inspector']['members'][number]
  onClose: () => void
  onRun: (action: string, extra?: Record<string, string>, tone?: ActionTone) => void
  onSetScenarioActor: (memberId: string) => void
  processingAction: null | string
  scenarioActorId: string
  scenarioTenantName: string
}) {
  return (
    <DrawerPanel
      description="Inspect identity, role rules, and quick member mutations without leaving the members workspace."
      footer={
        member ? (
          <div className="flex flex-wrap gap-2">
            <button className={buttonClass('secondary')} onClick={onClose} type="button">
              Close
            </button>
            <button
              className={buttonClass('secondary')}
              disabled={member.id === scenarioActorId}
              onClick={() => onSetScenarioActor(member.id)}
              type="button"
            >
              {member.id === scenarioActorId ? 'Scenario actor' : 'Set scenario actor'}
            </button>
            <button
              className={buttonClass(member.isActive ? 'danger' : 'primary')}
              disabled={processingAction === 'toggle-member-active'}
              onClick={() => onRun('toggle-member-active', { memberId: member.id })}
              type="button"
            >
              {processingAction === 'toggle-member-active'
                ? 'Running...'
                : member.isActive
                  ? 'Deactivate'
                  : 'Activate'}
            </button>
            <button
              className={buttonClass()}
              disabled={processingAction === 'change-member-role'}
              onClick={() => onRun('change-member-role', { memberId: member.id })}
              type="button"
            >
              {processingAction === 'change-member-role'
                ? 'Running...'
                : member.role === 'admin'
                  ? 'Demote'
                  : 'Promote'}
            </button>
          </div>
        ) : null
      }
      icon="manage_accounts"
      onClose={onClose}
      open={Boolean(member)}
      title={member ? member.name : 'Member inspector'}
    >
      {member ? (
        <div className="space-y-5">
          <DetailList>
            <DetailRow label="Name" value={member.name} />
            <DetailRow label="Email" value={member.email} />
            <DetailRow label="Tenant" value={scenarioTenantName} />
            <DetailRow label="Role" value={member.role} />
            <DetailRow label="Status" value={member.isActive ? 'active' : 'inactive'} />
            <DetailRow label="User id" value={member.userId} />
          </DetailList>

          <CompatibilityBlock
            items={[
              member.role === 'owner'
                ? 'Owner cannot be demoted or deactivated.'
                : 'Non-owner members remain valid targets for role and status probes.',
              member.id === scenarioActorId
                ? 'Self-targeting checks matter because self-deactivation should remain blocked.'
                : 'This row can become the scenario actor for permission-sensitive flows.',
              'Cross-tenant mutations remain forbidden even when the operator can see the row.',
            ]}
            title="Rules preview"
          />
        </div>
      ) : null}
    </DrawerPanel>
  )
}

function MembersTab({
  filteredMembers,
  memberRoleFilter,
  memberSearch,
  memberStatusFilter,
  onMemberClick,
  onRoleFilterChange,
  onSearchChange,
  onStatusFilterChange,
  recentActions,
  scenarioTenantName,
}: {
  filteredMembers: Props['inspector']['members']
  memberRoleFilter: 'admin' | 'all' | 'member' | 'owner'
  memberSearch: string
  memberStatusFilter: 'active' | 'all' | 'inactive'
  onMemberClick: (memberId: string) => void
  onRoleFilterChange: (value: 'admin' | 'all' | 'member' | 'owner') => void
  onSearchChange: (value: string) => void
  onStatusFilterChange: (value: 'active' | 'all' | 'inactive') => void
  recentActions: Props['inspector']['recentActions']
  scenarioTenantName: string
}) {
  return (
    <DataTable
      emptyMessage="No members match the current filters."
      headerContent={
        <div className="grid min-w-[720px] gap-2 md:grid-cols-[minmax(0,1.4fr)_180px_180px]">
          <input
            className={inputClass()}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search name, email, or user id"
            value={memberSearch}
          />
          <select
            className={inputClass()}
            onChange={(event) =>
              onRoleFilterChange(event.target.value as 'admin' | 'all' | 'member' | 'owner')
            }
            value={memberRoleFilter}
          >
            <option value="all">All roles</option>
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
            <option value="member">Member</option>
          </select>
          <select
            className={inputClass()}
            onChange={(event) =>
              onStatusFilterChange(event.target.value as 'active' | 'all' | 'inactive')
            }
            value={memberStatusFilter}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      }
      isEmpty={filteredMembers.length === 0}
      title="Members & Permissions"
    >
      <ScrollableTable maxHeightClass="max-h-[38rem]">
        <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-outline-variant/15 bg-surface-container-low text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Email</th>
              <th className="px-4 py-2.5">Role</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Tenant</th>
              <th className="px-4 py-2.5">Scenario actor</th>
              <th className="px-4 py-2.5">Last action</th>
              <th className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {filteredMembers.map((member) => (
              <tr
                className={`cursor-pointer transition-colors hover:bg-surface-container-low/70 ${
                  member.isCurrentActor ? 'bg-primary/5' : ''
                }`}
                key={member.id}
                onClick={() => onMemberClick(member.id)}
              >
                <td className="px-4 py-3 font-medium text-on-surface">{member.name}</td>
                <td className="px-4 py-3 text-on-surface-variant">{member.email}</td>
                <td className="px-4 py-3">
                  <RoleBadge role={member.role} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={member.isActive ? 'confirmed' : 'overdue'} />
                </td>
                <td className="px-4 py-3 text-on-surface-variant">{scenarioTenantName}</td>
                <td className="px-4 py-3">
                  {member.isCurrentActor ? (
                    <ToneBadge label="Scenario actor" tone="info" />
                  ) : (
                    <span className="text-xs text-on-surface-variant">Available</span>
                  )}
                </td>
                <td className="px-4 py-3 text-on-surface-variant">
                  {recentActions[0]
                    ? humanizeAuditAction(recentActions[0].action)
                    : 'No action yet'}
                </td>
                <td className="px-4 py-3 text-right">
                  <button className={rowActionButtonClass()} type="button">
                    Inspect
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollableTable>
    </DataTable>
  )
}

function MetricRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-outline-variant/12 bg-surface-container-low px-4 py-3">
      <p className={labelClass}>{label}</p>
      <p className="text-xl font-extrabold tabular-nums text-on-surface">{value}</p>
    </div>
  )
}

function OperationPanel({
  description,
  onRun,
  operations,
  processingAction,
  title,
}: {
  description: string
  onRun: (action: string, extra?: Record<string, string>, tone?: ActionTone) => void
  operations: Props['inspector']['globalOperations']
  processingAction: null | string
  title: string
}) {
  return (
    <TabPanel description={description} title={title}>
      <div className="space-y-3">
        {operations.map((operation) => {
          const tone = operation.tone === 'danger' ? 'danger' : 'secondary'
          return (
            <div
              className="rounded-2xl border border-outline-variant/12 bg-surface-container-low px-4 py-4"
              key={operation.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-on-surface">{operation.label}</h3>
                  <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                    {operation.impact}
                  </p>
                </div>
                <button
                  className={`${buttonClass(tone)} shrink-0`}
                  disabled={
                    !operation.available ||
                    !operation.action ||
                    processingAction === operation.action
                  }
                  onClick={() => operation.action && onRun(operation.action, {}, tone)}
                  type="button"
                >
                  {!operation.available
                    ? 'Soon'
                    : processingAction === operation.action
                      ? 'Running...'
                      : 'Run'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </TabPanel>
  )
}

function OverviewItem({
  label,
  mono = false,
  value,
}: {
  label: string
  mono?: boolean
  value: string
}) {
  return (
    <div className="rounded-2xl border border-outline-variant/12 bg-surface-container-low px-4 py-3">
      <p className={labelClass}>{label}</p>
      <p className={`mt-1 text-sm text-on-surface ${mono ? 'font-mono text-xs' : 'font-semibold'}`}>
        {value}
      </p>
    </div>
  )
}

function OverviewTab({
  context,
  memberships,
  metrics,
  processingAction,
  recentActions,
  selectedMembership,
  switchTenant,
}: {
  context: Props['inspector']['context']
  memberships: Props['inspector']['memberships']
  metrics: Props['inspector']['metrics']
  processingAction: null | string
  recentActions: Props['inspector']['recentActions']
  selectedMembership?: Props['inspector']['memberships'][number]
  switchTenant: (tenantId: string) => void
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_340px]">
      <TabPanel
        description="Current session and scenario state for the operator and the active test actor."
        title="Overview"
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <OverviewItem label="Operator read-only" value={context.readOnlyBadge} />
          <OverviewItem label="Access mode" value={context.accessMode} />
          <OverviewItem label="Session tenant" value={context.sessionTenant.name} />
          <OverviewItem label="Active actor" value={context.scenario.actorName} />
          <OverviewItem label="Current role" value={context.scenario.actorRole ?? 'none'} />
          <OverviewItem label="Workspace slug" mono value={context.scenario.tenantSlug} />
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <label className="space-y-2">
            <span className={labelClass}>Active tenant</span>
            <select
              className={inputClass()}
              onChange={(event) =>
                router.get(
                  '/_dev/inspector',
                  { memberId: '', tab: 'overview', tenantId: event.target.value },
                  { preserveScroll: true, preserveState: true, replace: true }
                )
              }
              value={context.scenario.tenantId}
            >
              {memberships.map((membership) => (
                <option key={membership.organizationId} value={membership.organizationId}>
                  {membership.organizationName} ({membership.role}
                  {membership.isActive ? '' : ', inactive'})
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button
              className={buttonClass()}
              onClick={() => switchTenant(context.scenario.tenantId)}
              type="button"
            >
              {processingAction === `switch:${context.scenario.tenantId}`
                ? 'Switching...'
                : 'Make session tenant active'}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <PermissionChip
            active={context.selectedMemberPermissions.accountingRead}
            label="Accounting read"
          />
          <PermissionChip
            active={context.selectedMemberPermissions.accountingWriteDrafts}
            label="Draft writes"
          />
          <PermissionChip
            active={context.selectedMemberPermissions.invoiceIssue}
            label="Issue invoice"
          />
          <PermissionChip
            active={context.selectedMemberPermissions.invoiceMarkPaid}
            label="Mark paid"
          />
          <PermissionChip
            active={context.selectedMemberPermissions.membershipList}
            label="List members"
          />
          <PermissionChip
            active={context.selectedMemberPermissions.membershipToggleActive}
            label="Toggle active"
          />
          <PermissionChip
            active={context.selectedMemberPermissions.membershipChangeRole}
            label="Change role"
          />
          <PermissionChip
            active={context.selectedMemberPermissions.auditTrailView}
            label="Audit trail"
          />
        </div>
      </TabPanel>

      <div className="space-y-4">
        <TabPanel title="Quick metrics">
          <div className="grid gap-3">
            <MetricRow label="Invoices" value={metrics.invoices} />
            <MetricRow label="Expenses" value={metrics.expenses} />
            <MetricRow label="Customers" value={metrics.customers} />
            <MetricRow label="Members" value={metrics.members} />
            <MetricRow label="Audit events" value={metrics.auditEvents} />
          </div>
        </TabPanel>

        <TabPanel title="Last run status">
          {recentActions[0] ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-on-surface">
                  {humanizeAuditAction(recentActions[0].action)}
                </p>
                <ToneBadge
                  label={recentActions[0].result}
                  tone={toneForAuditResult(recentActions[0].result)}
                />
              </div>
              <p className="text-sm text-on-surface-variant">
                {formatTimestamp(recentActions[0].timestamp)}
              </p>
            </div>
          ) : (
            <EmptyStateCopy text="No console actions recorded yet." />
          )}
        </TabPanel>

        {selectedMembership?.isActive === false ? (
          <TabPanel title="Membership status">
            <EmptyStateCopy text="The selected membership is inactive. Some scenario actions are expected to fail." />
          </TabPanel>
        ) : null}
      </div>
    </div>
  )
}

function PermissionChip({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
        active
          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700'
          : 'border-outline-variant/20 bg-surface-container-low text-on-surface-variant'
      }`}
    >
      {label}
    </span>
  )
}

function ProbeSummary({ subtitle, title }: { subtitle: string; title: string }) {
  return (
    <div className="rounded-2xl border border-outline-variant/12 bg-surface-container-low px-4 py-3">
      <p className="text-sm font-semibold text-on-surface">{title}</p>
      <p className="mt-2 text-sm leading-6 text-on-surface-variant">{subtitle}</p>
    </div>
  )
}

function ProbeTable({
  columns,
  rows,
  title,
}: {
  columns: string[]
  rows: ReactNode[][]
  title: string
}) {
  return (
    <DataTable
      emptyMessage={`No records available in ${title.toLowerCase()}.`}
      isEmpty={rows.length === 0}
      title={title}
    >
      <ScrollableTable maxHeightClass="max-h-[28rem]">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-outline-variant/15 bg-surface-container-low text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
              {columns.map((column) => (
                <th className="px-4 py-2.5" key={column}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {rows.map((row, rowIndex) => (
              <tr key={`${title}-${rowIndex}`}>
                {row.map((cell, cellIndex) => (
                  <td
                    className="px-4 py-3 text-on-surface-variant"
                    key={`${title}-${rowIndex}-${cellIndex}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollableTable>
    </DataTable>
  )
}

function RoleBadge({ role }: { role: 'admin' | 'member' | 'owner' }) {
  const tone = role === 'owner' ? 'warning' : role === 'admin' ? 'info' : 'neutral'
  return <ToneBadge label={role} tone={tone} />
}

function ScrollableTable({
  children,
  maxHeightClass = 'max-h-[26rem]',
}: {
  children: ReactNode
  maxHeightClass?: string
}) {
  return <div className={`overflow-auto ${maxHeightClass}`}>{children}</div>
}

function StickyTabs({
  activeTab,
  onChange,
}: {
  activeTab: DevConsoleTab
  onChange: (tab: DevConsoleTab) => void
}) {
  return (
    <nav className="sticky top-16 z-20 overflow-x-auto rounded-[18px] border border-outline-variant/15 bg-surface-container-lowest/95 px-2 py-2 shadow-ambient backdrop-blur-md">
      <div className="flex min-w-max items-center gap-2">
        {tabs.map((tab) => {
          const active = activeTab === tab.id
          return (
            <button
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                active
                  ? 'bg-on-surface text-background'
                  : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
              }`}
              key={tab.id}
              onClick={() => onChange(tab.id)}
              type="button"
            >
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.shortLabel}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

function TabPanel({
  children,
  description,
  title,
}: {
  children: ReactNode
  description?: string
  title: string
}) {
  return (
    <section className="rounded-[22px] border border-outline-variant/16 bg-surface-container-lowest shadow-ambient-tight">
      <div className="border-b border-outline-variant/10 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[1.35rem] font-extrabold tracking-tight text-on-surface">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm leading-6 text-on-surface-variant">{description}</p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="px-4 py-4">{children}</div>
    </section>
  )
}

function TenantFactoryTab({
  dangerOps,
  memberships,
  onRun,
  onSelectTenant,
  processingAction,
  selectedTenantId,
  tenantFactoryOps,
}: {
  dangerOps: Props['inspector']['globalOperations']
  memberships: Props['inspector']['memberships']
  onRun: (action: string, extra?: Record<string, string>, tone?: ActionTone) => void
  onSelectTenant: (tenantId: string) => void
  processingAction: null | string
  selectedTenantId: string
  tenantFactoryOps: Props['inspector']['globalOperations']
}) {
  return (
    <div className="space-y-4">
      <TabPanel title="Tenant Factory">
        <div className="grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">
          <label className="space-y-2">
            <span className={labelClass}>Tenant selector</span>
            <select
              className={inputClass()}
              onChange={(event) => onSelectTenant(event.target.value)}
              value={selectedTenantId}
            >
              {memberships.map((membership) => (
                <option key={membership.organizationId} value={membership.organizationId}>
                  {membership.organizationName} ({membership.role})
                </option>
              ))}
            </select>
          </label>
          <div className="rounded-2xl border border-outline-variant/12 bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
            Provisioning and destructive tenant actions are intentionally isolated in this tab so
            they never compete with member or audit work.
          </div>
        </div>
      </TabPanel>

      <div className="grid gap-4 xl:grid-cols-2">
        <OperationPanel
          description="Create local tenant scenarios quickly."
          onRun={onRun}
          operations={tenantFactoryOps}
          processingAction={processingAction}
          title="Provisioning"
        />
        <OperationPanel
          description="Destructive actions stay grouped and visually separated."
          onRun={onRun}
          operations={dangerOps}
          processingAction={processingAction}
          title="Danger zone"
        />
      </div>
    </div>
  )
}

function ToneBadge({
  label,
  tone,
}: {
  label: string
  tone: 'danger' | 'info' | 'neutral' | 'success' | 'warning'
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${toneBadgeClass(tone)}`}
    >
      {label}
    </span>
  )
}

function WorkflowProbesTab({
  customers,
  expenses,
  invoices,
  onOpenExpense,
  onOpenInvoice,
}: {
  customers: Props['inspector']['customers']
  expenses: Props['inspector']['expenses']
  invoices: Props['inspector']['invoices']
  onOpenExpense: (id: string) => void
  onOpenInvoice: (id: string) => void
}) {
  return (
    <div className="space-y-4">
      <TabPanel
        description="Keep business mutations focused in one workspace, separate from tenant setup and member administration."
        title="Workflow Probes"
      >
        <div className="grid gap-3 lg:grid-cols-3">
          <ProbeSummary
            subtitle="Create, issue, mark paid, delete draft, reject delete sent."
            title="Invoice actions"
          />
          <ProbeSummary
            subtitle="Create, confirm, delete draft, reject delete confirmed."
            title="Expense actions"
          />
          <ProbeSummary
            subtitle="Create/update/delete visibility is reserved for the next workflow slice."
            title="Customer actions"
          />
        </div>
      </TabPanel>

      <div className="grid gap-4 2xl:grid-cols-2">
        <ProbeTable
          columns={['Invoice', 'Customer', 'Status', 'Window', 'Total', 'Actions']}
          rows={invoices.map((invoice) => [
            invoice.invoiceNumber,
            invoice.customerCompanyName,
            <StatusBadge key={`${invoice.id}-status`} status={invoice.status} />,
            `${formatShortDate(invoice.issueDate)} to ${formatShortDate(invoice.dueDate)}`,
            formatMoney(invoice.totalInclTaxCents),
            <button
              className={rowActionButtonClass()}
              key={`${invoice.id}-action`}
              onClick={() => onOpenInvoice(invoice.id)}
              type="button"
            >
              Probe
            </button>,
          ])}
          title="Invoices"
        />
        <ProbeTable
          columns={['Expense', 'Category', 'Date', 'Status', 'Amount', 'Actions']}
          rows={expenses.map((expense) => [
            expense.label,
            expense.category,
            formatShortDate(expense.date),
            <StatusBadge key={`${expense.id}-status`} status={expense.status} />,
            formatMoney(expense.amountCents),
            <button
              className={rowActionButtonClass()}
              key={`${expense.id}-action`}
              onClick={() => onOpenExpense(expense.id)}
              type="button"
            >
              Probe
            </button>,
          ])}
          title="Expenses"
        />
      </div>

      <ProbeTable
        columns={['Company', 'Contact', 'Email', 'Phone', 'Created']}
        rows={customers.map((customer) => [
          customer.company,
          customer.name,
          customer.email,
          customer.phone,
          formatTimestamp(customer.createdAt),
        ])}
        title="Customers"
      />
    </div>
  )
}

const labelClass = 'text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant'

function rowActionButtonClass() {
  return 'rounded-lg border border-outline-variant/20 bg-surface-container-low px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-on-surface transition-colors hover:bg-surface-container'
}

function toneBadgeClass(tone: 'danger' | 'info' | 'neutral' | 'success' | 'warning') {
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

function toneForAuditResult(result: 'denied' | 'error' | 'success') {
  switch (result) {
    case 'denied':
      return 'warning' as const
    case 'success':
      return 'success' as const
    default:
      return 'danger' as const
  }
}
