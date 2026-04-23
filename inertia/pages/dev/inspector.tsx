import type { ReactNode } from 'react'

import { Head, router } from '@inertiajs/react'
import { startTransition, useEffect, useState } from 'react'

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
type MemberRoleFilter = 'admin' | 'all' | 'member' | 'owner'
type MemberStatusFilter = 'active' | 'all' | 'inactive'
type ProbeType = 'customers' | 'expenses' | 'invoices'
type Props = InertiaProps<{
  inspector: {
    audit: {
      actors: { id: string; label: string }[]
      events: {
        action: string
        actorEmail: null | string
        actorId: null | string
        actorName: null | string
        details: null | Record<string, unknown>
        entityId: string
        entityType: string
        errorCode: null | string
        id: string
        organizationId: string
        organizationName: string
        result: 'denied' | 'error' | 'success'
        timestamp: string
      }[]
      filters: {
        action: string
        actorId: string
        search: string
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
      singleTenantMode: boolean
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
      unavailableLabel?: string
    }[]
    inspectableTenants: {
      id: string
      isSessionTenant: boolean
      name: string
      slug: string
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
      auditSearch: string
      memberRole: MemberRoleFilter
      memberSearch: string
      memberStatus: MemberStatusFilter
      probeType: ProbeType
      selectedRecordId: string
    }
  }
}>

type WorkflowActionState = {
  allowed: boolean
  attemptable?: boolean
  extra: Record<string, string>
  id: string
  label: string
  reason: string
  tone: ActionTone
}

const tabs: { id: DevConsoleTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'tenant-factory', label: 'Tenant Factory' },
  { id: 'members-permissions', label: 'Members & Permissions' },
  { id: 'data-generator', label: 'Data Generator' },
  { id: 'workflow-probes', label: 'Workflow Probes' },
  { id: 'audit-trail', label: 'Audit Trail' },
]

export default function DevInspectorPage({ inspector }: Props) {
  const [processingAction, setProcessingAction] = useState<null | string>(null)
  const [selectedMemberId, setSelectedMemberId] = useState<null | string>(null)
  const [selectedAuditEventId, setSelectedAuditEventId] = useState<null | string>(null)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [tenantModalOpen, setTenantModalOpen] = useState(false)
  const [invoiceBatchCount, setInvoiceBatchCount] = useState('12')
  const [expenseBatchCount, setExpenseBatchCount] = useState('8')
  const [customerBatchCount, setCustomerBatchCount] = useState('6')
  const [allowUnauthorizedMode, setAllowUnauthorizedMode] = useState(false)
  const {
    audit,
    context,
    customers,
    expenses,
    globalOperations,
    inspectableTenants,
    invoices,
    members,
    metrics,
    recentActions,
    view,
  } = inspector
  const memberSearch = view.memberSearch
  const memberRoleFilter = view.memberRole
  const memberStatusFilter = view.memberStatus
  const auditSearch = view.auditSearch
  const probeType = view.probeType
  const selectedRecordId = view.selectedRecordId
  const generatorActorId = context.selectedMemberId

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandPaletteOpen(true)
      }

      if (event.key.toLowerCase() === 'r' && !event.metaKey && !event.ctrlKey && !event.altKey) {
        const target = event.target
        if (
          target instanceof HTMLElement &&
          ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)
        ) {
          return
        }

        event.preventDefault()
        refreshSelection()
      }
    }

    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [
    audit.filters.action,
    audit.filters.actorId,
    auditSearch,
    context.selectedMemberId,
    context.selectedTenantId,
    memberRoleFilter,
    memberSearch,
    memberStatusFilter,
    probeType,
    selectedRecordId,
    view.activeTab,
  ])

  const selectedMember = selectedMemberId
    ? (members.find((member) => member.id === selectedMemberId) ?? null)
    : null
  const selectedAuditEvent = selectedAuditEventId
    ? (audit.events.find((event) => event.id === selectedAuditEventId) ?? null)
    : null
  const selectedInvoice = invoices.find((invoice) => invoice.id === selectedRecordId) ?? null
  const selectedExpense = expenses.find((expense) => expense.id === selectedRecordId) ?? null
  const selectedCustomer = customers.find((customer) => customer.id === selectedRecordId) ?? null
  const selectedProbeRecord =
    probeType === 'invoices'
      ? selectedInvoice
      : probeType === 'expenses'
        ? selectedExpense
        : selectedCustomer
  const filteredMembers = members.filter((member) => {
    const query = memberSearch.trim().toLowerCase()
    const matchesSearch =
      !query || `${member.name} ${member.email} ${member.userId}`.toLowerCase().includes(query)
    const matchesRole = memberRoleFilter === 'all' || member.role === memberRoleFilter
    const matchesStatus =
      memberStatusFilter === 'all' ||
      (memberStatusFilter === 'active' ? member.isActive : !member.isActive)

    return matchesSearch && matchesRole && matchesStatus
  })
  const filteredAuditEvents = audit.events.filter((event) => {
    const query = auditSearch.trim().toLowerCase()
    if (!query) return true

    return [
      event.action,
      event.entityType,
      event.entityId,
      event.organizationName,
      event.actorName,
      event.actorEmail,
      event.errorCode,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query))
  })
  const recentDenials = recentActions.filter((action) => action.result === 'denied').slice(0, 4)
  const dangerOps = globalOperations.filter((operation) => operation.section === 'danger_zone')
  const tabCounts: Record<DevConsoleTab, null | number> = {
    'audit-trail': filteredAuditEvents.length,
    'data-generator': 4,
    'members-permissions': filteredMembers.length,
    overview: null,
    'tenant-factory': 1 + dangerOps.length,
    'workflow-probes':
      probeType === 'invoices'
        ? invoices.length
        : probeType === 'expenses'
          ? expenses.length
          : customers.length,
  }

  function buildQuery(overrides: Record<string, null | string | undefined> = {}) {
    const query: Record<string, string> = {}
    const source = {
      action: audit.filters.action,
      actorId: audit.filters.actorId,
      auditSearch,
      memberId: context.selectedMemberId,
      memberRole: memberRoleFilter,
      memberSearch,
      memberStatus: memberStatusFilter,
      probeType,
      selectedRecordId,
      tab: view.activeTab,
      tenantId: context.selectedTenantId,
      ...overrides,
    }

    for (const [key, value] of Object.entries(source)) {
      if (!value) continue
      if ((key === 'memberRole' || key === 'memberStatus') && value === 'all') continue
      query[key] = value
    }

    return query
  }

  function refreshSelection(overrides: Record<string, null | string | undefined> = {}) {
    router.get('/_dev/inspector', buildQuery(overrides), {
      preserveScroll: true,
      preserveState: true,
      replace: true,
    })
  }

  function setActiveTab(tab: DevConsoleTab) {
    startTransition(() => refreshSelection({ tab }))
  }

  function switchTenant(tenantId: string) {
    refreshSelection({ selectedRecordId: '', tenantId })
  }

  function runAction(
    action: string,
    extra: Record<string, string> = {},
    tone: ActionTone = 'primary',
    confirmMessage?: string
  ) {
    if (confirmMessage && typeof window !== 'undefined' && !window.confirm(confirmMessage)) {
      return
    }

    setProcessingAction(action)
    router.post(
      `/_dev/inspector/actions/${action}`,
      {
        ...buildQuery(),
        ...extra,
      } as never,
      {
        onFinish: () => setProcessingAction(null),
        preserveScroll: true,
        preserveState: tone !== 'danger',
      }
    )
  }

  function copyText(value: string) {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return
    void navigator.clipboard.writeText(value)
  }

  return (
    <>
      <Head title="Dev Console" />

      <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-3">
        <DevConsoleHeader
          onRefresh={() => refreshSelection()}
          operatorEmail={context.operator.email}
          operatorName={context.operator.name}
          readOnlyBadge={context.readOnlyBadge}
        />

        <StickyTabs activeTab={view.activeTab} counts={tabCounts} onChange={setActiveTab} />

        {view.activeTab === 'overview' ? (
          <OverviewTab
            context={context}
            metrics={metrics}
            onOpenAudit={() => refreshSelection({ tab: 'audit-trail' })}
            onOpenMembers={() => refreshSelection({ tab: 'members-permissions' })}
            onOpenProbe={(nextProbeType) =>
              refreshSelection({ probeType: nextProbeType, tab: 'workflow-probes' })
            }
            processingAction={processingAction}
            recentActions={recentActions}
            recentDenials={recentDenials}
            switchTenant={switchTenant}
          />
        ) : null}

        {view.activeTab === 'tenant-factory' ? (
          <TenantFactoryTab
            dangerOps={dangerOps}
            inspectableTenants={inspectableTenants}
            onCreateTenant={() => {
              if (context.singleTenantMode) return
              setTenantModalOpen(true)
            }}
            onRun={runAction}
            onSelectTenant={(tenantId) =>
              refreshSelection({ memberId: '', selectedRecordId: '', tenantId })
            }
            processingAction={processingAction}
            selectedTenantId={context.selectedTenantId}
            singleTenantMode={context.singleTenantMode}
          />
        ) : null}

        {view.activeTab === 'members-permissions' ? (
          <MembersTab
            filteredMembers={filteredMembers}
            key={`${memberSearch}:${memberRoleFilter}:${memberStatusFilter}`}
            memberRoleFilter={memberRoleFilter}
            memberSearch={memberSearch}
            memberStatusFilter={memberStatusFilter}
            onMemberClick={setSelectedMemberId}
            onRoleFilterChange={(next) =>
              refreshSelection({ memberRole: next, tab: 'members-permissions' })
            }
            onSearchChange={(next) =>
              refreshSelection({ memberSearch: next, tab: 'members-permissions' })
            }
            onStatusFilterChange={(next) =>
              refreshSelection({ memberStatus: next, tab: 'members-permissions' })
            }
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
            onActorChange={(memberId) => refreshSelection({ memberId, tab: 'data-generator' })}
            onAllowUnauthorizedModeChange={setAllowUnauthorizedMode}
            onCustomerBatchCountChange={setCustomerBatchCount}
            onExpenseBatchCountChange={setExpenseBatchCount}
            onInvoiceBatchCountChange={setInvoiceBatchCount}
            onRun={(action, extra, tone) =>
              runAction(action, { ...extra, memberId: generatorActorId }, tone)
            }
            processingAction={processingAction}
          />
        ) : null}

        {view.activeTab === 'workflow-probes' ? (
          <WorkflowProbesTab
            allowUnauthorizedMode={allowUnauthorizedMode}
            context={context}
            copyText={copyText}
            customers={customers}
            expenses={expenses}
            inspectableTenants={inspectableTenants}
            invoices={invoices}
            members={members}
            onAllowUnauthorizedModeChange={setAllowUnauthorizedMode}
            onChangeProbeType={(next) => {
              refreshSelection({ probeType: next, selectedRecordId: '', tab: 'workflow-probes' })
            }}
            onRun={runAction}
            onSelectActor={(memberId) =>
              refreshSelection({ memberId, selectedRecordId: '', tab: 'workflow-probes' })
            }
            onSelectRecord={(recordId) => {
              refreshSelection({ selectedRecordId: recordId, tab: 'workflow-probes' })
            }}
            onSelectTenant={(tenantId) =>
              refreshSelection({
                memberId: '',
                selectedRecordId: '',
                tab: 'workflow-probes',
                tenantId,
              })
            }
            probeType={probeType}
            processingAction={processingAction}
            selectedCustomer={selectedCustomer}
            selectedExpense={selectedExpense}
            selectedInvoice={selectedInvoice}
            selectedRecord={selectedProbeRecord}
          />
        ) : null}

        {view.activeTab === 'audit-trail' ? (
          <AuditTrailTab
            audit={audit}
            auditSearch={auditSearch}
            filteredEvents={filteredAuditEvents}
            key={`${audit.filters.action}:${audit.filters.actorId}:${audit.filters.tenantId}:${auditSearch}`}
            onActionFilterChange={(action) => refreshSelection({ action, tab: 'audit-trail' })}
            onActorFilterChange={(actorId) => refreshSelection({ actorId, tab: 'audit-trail' })}
            onAuditSearchChange={(search) =>
              refreshSelection({ auditSearch: search, tab: 'audit-trail' })
            }
            onEventClick={setSelectedAuditEventId}
            onTenantFilterChange={(tenantId) => refreshSelection({ tab: 'audit-trail', tenantId })}
          />
        ) : null}

        <MemberDrawer
          copyText={copyText}
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

        <AuditEventDrawer
          event={selectedAuditEvent}
          onClose={() => setSelectedAuditEventId(null)}
        />

        <CommandPalette
          onClose={() => setCommandPaletteOpen(false)}
          onNavigate={(tab) => {
            setCommandPaletteOpen(false)
            setActiveTab(tab)
          }}
          onRefresh={() => {
            setCommandPaletteOpen(false)
            refreshSelection()
          }}
          open={commandPaletteOpen}
        />

        {tenantModalOpen && !context.singleTenantMode ? (
          <CreateTenantModal
            onClose={() => setTenantModalOpen(false)}
            onSubmit={(payload) => {
              setTenantModalOpen(false)
              runAction('create-tenant', payload)
            }}
            processingAction={processingAction}
          />
        ) : null}
      </div>
    </>
  )
}

function ActivityList({
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

function AuditEventDrawer({
  event,
  onClose,
}: {
  event: null | Props['inspector']['audit']['events'][number]
  onClose: () => void
}) {
  return (
    <DrawerPanel
      description="Compact event payload and result details for denied, error, and success paths."
      footer={
        <button className={buttonClass('secondary')} onClick={onClose} type="button">
          Close
        </button>
      }
      icon="data_object"
      onClose={onClose}
      open={Boolean(event)}
      title={event ? humanizeAuditAction(event.action) : 'Audit event'}
    >
      {event ? (
        <div className="space-y-4">
          <DetailList>
            <DetailRow label="Timestamp" value={formatTimestamp(event.timestamp)} />
            <DetailRow
              label="Actor"
              value={event.actorName || event.actorEmail || event.actorId || 'system'}
            />
            <DetailRow label="Tenant" value={event.organizationName} />
            <DetailRow label="Entity" value={`${event.entityType}:${event.entityId}`} />
            <DetailRow
              label="Result"
              value={<ToneBadge label={event.result} tone={toneForAuditResult(event.result)} />}
            />
            <DetailRow label="Error code" value={event.errorCode ?? 'none'} />
          </DetailList>

          <JsonPreview
            title="JSON details"
            value={event.details ?? { message: 'No structured details on this event.' }}
          />
        </div>
      ) : null}
    </DrawerPanel>
  )
}

function AuditTrailTab({
  audit,
  auditSearch,
  filteredEvents,
  onActionFilterChange,
  onActorFilterChange,
  onAuditSearchChange,
  onEventClick,
  onTenantFilterChange,
}: {
  audit: Props['inspector']['audit']
  auditSearch: string
  filteredEvents: Props['inspector']['audit']['events']
  onActionFilterChange: (value: string) => void
  onActorFilterChange: (value: string) => void
  onAuditSearchChange: (value: string) => void
  onEventClick: (eventId: string) => void
  onTenantFilterChange: (value: string) => void
}) {
  const [visibleCount, setVisibleCount] = useState(20)
  const visibleEvents = filteredEvents.slice(0, visibleCount)

  return (
    <DataTable
      emptyMessage="No audit events match the active filters."
      headerContent={
        <div className="grid min-w-[920px] gap-2 xl:grid-cols-[minmax(0,1.2fr)_220px_220px_200px]">
          <input
            className={inputClass()}
            onChange={(event) => onAuditSearchChange(event.target.value)}
            placeholder="Search actor, entity, action, error code"
            value={auditSearch}
          />
          <input
            className={inputClass()}
            onChange={(event) => onActionFilterChange(event.target.value)}
            placeholder="Filter action"
            value={audit.filters.action}
          />
          <select
            className={inputClass()}
            onChange={(event) => onActorFilterChange(event.target.value)}
            value={audit.filters.actorId}
          >
            <option value="">All actors</option>
            {audit.actors.map((actor) => (
              <option key={actor.id} value={actor.id}>
                {actor.label}
              </option>
            ))}
          </select>
          <select
            className={inputClass()}
            onChange={(event) => onTenantFilterChange(event.target.value)}
            value={audit.filters.tenantId}
          >
            {audit.tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.label}
              </option>
            ))}
          </select>
        </div>
      }
      isEmpty={visibleEvents.length === 0}
      title="Audit Trail"
    >
      <div className="space-y-3">
        <ScrollableTable maxHeightClass="max-h-[34rem]">
          <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-20">
              <tr className="border-b border-outline-variant/12 bg-surface-container-low text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                <th className="sticky left-0 z-10 bg-surface-container-low px-3 py-2">Timestamp</th>
                <th className="px-3 py-2">Actor</th>
                <th className="px-3 py-2">Tenant</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Entity</th>
                <th className="px-3 py-2">Result</th>
                <th className="px-3 py-2">Error code</th>
              </tr>
            </thead>
            <tbody>
              {visibleEvents.map((event, index) => (
                <tr
                  className={`cursor-pointer border-b border-outline-variant/8 transition-colors hover:bg-surface-container-low/75 ${
                    index % 2 === 0
                      ? 'bg-surface-container-lowest'
                      : 'bg-surface-container-lowest/70'
                  }`}
                  key={event.id}
                  onClick={() => onEventClick(event.id)}
                >
                  <td className="sticky left-0 bg-inherit px-3 py-2.5 text-xs text-on-surface-variant">
                    {formatTimestamp(event.timestamp)}
                  </td>
                  <td className="px-3 py-2.5 text-on-surface">
                    {event.actorName || event.actorEmail || event.actorId || 'system'}
                  </td>
                  <td className="px-3 py-2.5 text-on-surface-variant">{event.organizationName}</td>
                  <td className="px-3 py-2.5 font-medium text-on-surface">
                    {humanizeAuditAction(event.action)}
                  </td>
                  <td className="px-3 py-2.5 text-on-surface-variant">
                    {event.entityType}:{event.entityId}
                  </td>
                  <td className="px-3 py-2.5">
                    <ToneBadge label={event.result} tone={toneForAuditResult(event.result)} />
                  </td>
                  <td className="px-3 py-2.5 text-on-surface-variant">{event.errorCode ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollableTable>

        {filteredEvents.length > visibleCount ? (
          <div className="flex justify-end">
            <button
              className={buttonClass('secondary')}
              onClick={() => setVisibleCount((count) => count + 20)}
              type="button"
            >
              Load more
            </button>
          </div>
        ) : null}
      </div>
    </DataTable>
  )
}

function buttonClass(tone: ActionTone = 'primary') {
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

function CommandPalette({
  onClose,
  onNavigate,
  onRefresh,
  open,
}: {
  onClose: () => void
  onNavigate: (tab: DevConsoleTab) => void
  onRefresh: () => void
  open: boolean
}) {
  return (
    <Modal onClose={onClose} open={open} size="sm" title="Command Palette">
      <div className="space-y-3">
        <section className="space-y-2">
          <p className={labelClass}>Navigation</p>
          <div className="grid gap-2">
            {tabs.map((tab) => (
              <button
                className="flex items-center justify-between rounded-xl border border-outline-variant/15 bg-surface-container-low px-3 py-2.5 text-left text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container"
                key={tab.id}
                onClick={() => onNavigate(tab.id)}
                type="button"
              >
                <span>{tab.label}</span>
                <span className="text-xs text-on-surface-variant">Open</span>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <p className={labelClass}>Actions</p>
          <button
            className="flex w-full items-center justify-between rounded-xl border border-outline-variant/15 bg-surface-container-low px-3 py-2.5 text-left text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container"
            onClick={onRefresh}
            type="button"
          >
            <span>Refresh console</span>
            <span className="text-xs text-on-surface-variant">R</span>
          </button>
        </section>
      </div>
    </Modal>
  )
}

function CompactPanel({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="rounded-2xl border border-outline-variant/12 bg-surface-container-lowest">
      <div className="border-b border-outline-variant/10 px-4 py-3">
        <h2 className="text-base font-semibold text-on-surface">{title}</h2>
      </div>
      <div className="px-4 py-4">{children}</div>
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
    <div className="space-y-3">
      <CompactPanel title="Data Generator">
        <div className="grid gap-2 xl:grid-cols-[220px_220px_minmax(0,1fr)]">
          <label className="space-y-1.5">
            <span className={labelClass}>Actor</span>
            <select
              className={inputClass()}
              onChange={(event) => onActorChange(event.target.value)}
              value={actorId}
            >
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} ({member.role})
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className={labelClass}>Unauthorized mode</span>
            <button
              className={`${buttonClass('secondary')} w-full`}
              onClick={() => onAllowUnauthorizedModeChange(!allowUnauthorizedMode)}
              type="button"
            >
              {allowUnauthorizedMode ? 'Enabled' : 'Disabled'}
            </button>
          </label>

          <div className="rounded-xl border border-outline-variant/12 bg-surface-container-low px-3 py-2.5 text-sm text-on-surface-variant">
            Batch generators stay isolated from live probes. Use them to prepare realistic manual
            scenarios quickly.
          </div>
        </div>
      </CompactPanel>

      <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-4">
        <GeneratorCard
          action="create-invoice-test"
          count={invoiceBatchCount}
          label="Invoice batch"
          onCountChange={onInvoiceBatchCountChange}
          onRun={onRun}
          processingAction={processingAction}
          summary="Draft-heavy batch for issue, pay, and delete tests."
        />
        <GeneratorCard
          action="create-expense-test"
          count={expenseBatchCount}
          label="Expense batch"
          onCountChange={onExpenseBatchCountChange}
          onRun={onRun}
          processingAction={processingAction}
          summary="Mixed draft expenses for confirm and delete checks."
        />
        <GeneratorCard
          action="create-customer-batch"
          count={customerBatchCount}
          label="Customer batch"
          onCountChange={onCustomerBatchCountChange}
          onRun={onRun}
          processingAction={processingAction}
          summary="Realistic contacts and companies for seeded flows."
        />
        <GeneratorCard
          action="generate-demo-data"
          count="full"
          label="Full dataset"
          onCountChange={() => undefined}
          onRun={onRun}
          processingAction={processingAction}
          readOnlyCount
          summary="Customers, invoices, expenses, and mixed states."
        />
      </div>
    </div>
  )
}

function DetailList({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant/12 bg-surface-container-low">
      {children}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)] gap-4 border-b border-outline-variant/10 px-3 py-2.5 last:border-b-0">
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

function EmptyStateCopy({ text }: { text: string }) {
  return <p className="text-sm text-on-surface-variant">{text}</p>
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

function humanizeAuditAction(action: string) {
  return action.replaceAll('_', ' ')
}

function inputClass() {
  return 'w-full rounded-lg border border-outline-variant/18 bg-surface-container-low px-3 py-2 text-sm text-on-surface outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary/25'
}

function JsonPreview({ title, value }: { title: string; value: unknown }) {
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

function MemberDrawer({
  copyText,
  member,
  onClose,
  onRun,
  onSetScenarioActor,
  processingAction,
  scenarioActorId,
  scenarioTenantName,
}: {
  copyText: (value: string) => void
  member: null | Props['inspector']['members'][number]
  onClose: () => void
  onRun: (
    action: string,
    extra?: Record<string, string>,
    tone?: ActionTone,
    confirmMessage?: string
  ) => void
  onSetScenarioActor: (memberId: string) => void
  processingAction: null | string
  scenarioActorId: string
  scenarioTenantName: string
}) {
  return (
    <DrawerPanel
      description="Identity, role rules, and fast member mutations for RBAC and isolation checks."
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
              onClick={() =>
                onRun(
                  'toggle-member-active',
                  { memberId: member.id },
                  member.isActive ? 'danger' : 'primary',
                  member.isActive ? 'Deactivate this member?' : undefined
                )
              }
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
        <div className="space-y-4">
          <DetailList>
            <DetailRow label="Name" value={member.name} />
            <DetailRow label="Email" value={member.email} />
            <DetailRow label="Tenant" value={scenarioTenantName} />
            <DetailRow label="Role" value={<RoleBadge role={member.role} />} />
            <DetailRow
              label="Status"
              value={
                <ToneBadge
                  label={member.isActive ? 'active' : 'inactive'}
                  tone={member.isActive ? 'success' : 'warning'}
                />
              }
            />
            <DetailRow
              label="User id"
              value={
                <div className="flex justify-end gap-2">
                  <span className="font-mono text-xs">{member.userId}</span>
                  <button
                    className={copyButtonClass()}
                    onClick={() => copyText(member.userId)}
                    type="button"
                  >
                    Copy
                  </button>
                </div>
              }
            />
          </DetailList>

          <RuleList
            rules={[
              {
                allowed: member.role !== 'owner',
                label: 'Owner cannot be demoted',
                reason:
                  member.role === 'owner'
                    ? 'Blocked by role invariant.'
                    : 'No owner lock on this row.',
              },
              {
                allowed: member.id !== scenarioActorId,
                label: 'Self deactivation blocked',
                reason:
                  member.id === scenarioActorId
                    ? 'Current scenario actor should not deactivate itself.'
                    : 'Safe target for cross-member status checks.',
              },
              {
                allowed: member.role === 'member',
                label: 'Member can be promoted',
                reason: member.role === 'member' ? 'Valid promotion path.' : 'Already elevated.',
              },
              {
                allowed: false,
                label: 'Cross-tenant forbidden',
                reason: 'Mutations outside the selected tenant remain blocked.',
              },
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
  memberRoleFilter: MemberRoleFilter
  memberSearch: string
  memberStatusFilter: MemberStatusFilter
  onMemberClick: (memberId: string) => void
  onRoleFilterChange: (value: MemberRoleFilter) => void
  onSearchChange: (value: string) => void
  onStatusFilterChange: (value: MemberStatusFilter) => void
  recentActions: Props['inspector']['recentActions']
  scenarioTenantName: string
}) {
  const [visibleCount, setVisibleCount] = useState(12)
  return (
    <DataTable
      emptyMessage="No members match the current filters."
      headerContent={
        <div className="grid min-w-[720px] gap-2 lg:grid-cols-[minmax(0,1.4fr)_180px_180px]">
          <input
            className={inputClass()}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search name, email, user id"
            value={memberSearch}
          />
          <select
            className={inputClass()}
            onChange={(event) => onRoleFilterChange(event.target.value as MemberRoleFilter)}
            value={memberRoleFilter}
          >
            <option value="all">All roles</option>
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
            <option value="member">Member</option>
          </select>
          <select
            className={inputClass()}
            onChange={(event) => onStatusFilterChange(event.target.value as MemberStatusFilter)}
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
      <div className="space-y-3">
        <ScrollableTable maxHeightClass="max-h-[38rem]">
          <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-20">
              <tr className="border-b border-outline-variant/12 bg-surface-container-low text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Tenant</th>
                <th className="px-3 py-2">Scenario actor</th>
                <th className="px-3 py-2">Last action</th>
                <th className="sticky right-0 bg-surface-container-low px-3 py-2 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.slice(0, visibleCount).map((member, index) => (
                <tr
                  className={`cursor-pointer border-b border-outline-variant/8 transition-colors hover:bg-surface-container-low/75 ${
                    member.isCurrentActor
                      ? 'bg-primary/6'
                      : index % 2 === 0
                        ? 'bg-surface-container-lowest'
                        : 'bg-surface-container-lowest/70'
                  }`}
                  key={member.id}
                  onClick={() => onMemberClick(member.id)}
                >
                  <td className="px-3 py-2.5 font-medium text-on-surface">{member.name}</td>
                  <td className="px-3 py-2.5 text-on-surface-variant">{member.email}</td>
                  <td className="px-3 py-2.5">
                    <RoleBadge role={member.role} />
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={member.isActive ? 'confirmed' : 'overdue'} />
                  </td>
                  <td className="px-3 py-2.5 text-on-surface-variant">{scenarioTenantName}</td>
                  <td className="px-3 py-2.5">
                    {member.isCurrentActor ? (
                      <ToneBadge label="Scenario actor" tone="info" />
                    ) : (
                      <span className="text-xs text-on-surface-variant">Available</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-on-surface-variant">
                    {recentActions[0]
                      ? humanizeAuditAction(recentActions[0].action)
                      : 'No action yet'}
                  </td>
                  <td className="sticky right-0 bg-inherit px-3 py-2.5 text-right">
                    <button className={rowActionButtonClass()} type="button">
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollableTable>

        {filteredMembers.length > visibleCount ? (
          <div className="flex justify-end">
            <button
              className={buttonClass('secondary')}
              onClick={() => setVisibleCount((count) => count + 12)}
              type="button"
            >
              Load more
            </button>
          </div>
        ) : null}
      </div>
    </DataTable>
  )
}

function MetricCard({
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

function OverviewTab({
  context,
  metrics,
  onOpenAudit,
  onOpenMembers,
  onOpenProbe,
  processingAction,
  recentActions,
  recentDenials,
  switchTenant,
}: {
  context: Props['inspector']['context']
  metrics: Props['inspector']['metrics']
  onOpenAudit: () => void
  onOpenMembers: () => void
  onOpenProbe: (probeType: ProbeType) => void
  processingAction: null | string
  recentActions: Props['inspector']['recentActions']
  recentDenials: Props['inspector']['recentActions']
  switchTenant: (tenantId: string) => void
}) {
  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1.25fr)_360px]">
      <CompactPanel title="Active Context">
        <div className="space-y-4">
          <DetailList>
            <DetailRow label="Session tenant" value={context.sessionTenant.name} />
            <DetailRow label="Active actor" value={context.scenario.actorName} />
            <DetailRow label="Current role" value={context.scenario.actorRole ?? 'none'} />
            <DetailRow
              label="Make active"
              value={
                <button
                  className={buttonClass()}
                  onClick={() => switchTenant(context.scenario.tenantId)}
                  type="button"
                >
                  {processingAction === `switch:${context.scenario.tenantId}`
                    ? 'Switching...'
                    : 'Make session tenant active'}
                </button>
              }
            />
          </DetailList>

          <div className="flex flex-wrap gap-2">
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
        </div>
      </CompactPanel>

      <CompactPanel title="Quick Metrics">
        <div className="grid gap-2">
          <MetricCard
            hint={metrics.invoices === 0 ? 'No draft or issued data' : 'Open workflow probes'}
            isWarning={metrics.invoices === 0}
            label="Invoices"
            onClick={() => onOpenProbe('invoices')}
            value={metrics.invoices}
          />
          <MetricCard
            hint={metrics.expenses === 0 ? 'No expense data' : 'Open workflow probes'}
            isWarning={metrics.expenses === 0}
            label="Expenses"
            onClick={() => onOpenProbe('expenses')}
            value={metrics.expenses}
          />
          <MetricCard
            hint={metrics.customers === 0 ? 'No customer data' : 'Open workflow probes'}
            isWarning={metrics.customers === 0}
            label="Customers"
            onClick={() => onOpenProbe('customers')}
            value={metrics.customers}
          />
          <MetricCard
            hint="Inspect authorization targets"
            label="Members"
            onClick={onOpenMembers}
            value={metrics.members}
          />
          <MetricCard
            hint="Latest console activity"
            label="Audit events"
            onClick={onOpenAudit}
            value={metrics.auditEvents}
          />
        </div>
      </CompactPanel>

      <CompactPanel title="Recent Actions">
        {recentActions.length > 0 ? (
          <ActivityList
            items={recentActions.map((action) => ({
              id: action.id,
              label: humanizeAuditAction(action.action),
              meta: formatTimestamp(action.timestamp),
              tone: toneForAuditResult(action.result),
              toneLabel: action.result,
            }))}
          />
        ) : (
          <EmptyStateCopy text="No console actions recorded yet." />
        )}
      </CompactPanel>

      <CompactPanel title="Recent Denials">
        {recentDenials.length > 0 ? (
          <ActivityList
            items={recentDenials.map((action) => ({
              id: action.id,
              label: humanizeAuditAction(action.action),
              meta: formatTimestamp(action.timestamp),
              tone: 'warning',
              toneLabel: 'denied',
            }))}
          />
        ) : (
          <EmptyStateCopy text="No denied actions in the latest runs." />
        )}
      </CompactPanel>
    </div>
  )
}

function PermissionChip({ active, label }: { active: boolean; label: string }) {
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

function RoleBadge({ role }: { role: 'admin' | 'member' | 'owner' }) {
  const tone = role === 'owner' ? 'warning' : role === 'admin' ? 'info' : 'neutral'
  return <ToneBadge label={role} tone={tone} />
}

function RuleList({
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

function TenantFactoryTab({
  dangerOps,
  inspectableTenants,
  onCreateTenant,
  onRun,
  onSelectTenant,
  processingAction,
  selectedTenantId,
  singleTenantMode,
}: {
  dangerOps: Props['inspector']['globalOperations']
  inspectableTenants: Props['inspector']['inspectableTenants']
  onCreateTenant: () => void
  onRun: (
    action: string,
    extra?: Record<string, string>,
    tone?: ActionTone,
    confirmMessage?: string
  ) => void
  onSelectTenant: (tenantId: string) => void
  processingAction: null | string
  selectedTenantId: string
  singleTenantMode: boolean
}) {
  return (
    <div className="space-y-3">
      <CompactPanel title="Tenant Factory">
        <div className="grid gap-2 lg:grid-cols-[280px_auto_minmax(0,1fr)]">
          <label className="space-y-1.5">
            <span className={labelClass}>Tenant selector</span>
            <select
              className={inputClass()}
              onChange={(event) => onSelectTenant(event.target.value)}
              value={selectedTenantId}
            >
              {inspectableTenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                  {tenant.isSessionTenant ? ' (session)' : ''}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button
              className={`${buttonClass()} w-full`}
              disabled={singleTenantMode}
              onClick={onCreateTenant}
              type="button"
            >
              {singleTenantMode ? 'Unavailable' : 'Create tenant'}
            </button>
          </div>
          <div className="rounded-xl border border-outline-variant/12 bg-surface-container-low px-3 py-2.5 text-sm text-on-surface-variant">
            {singleTenantMode
              ? 'Single-tenant mode is active. Only the default tenant and the private dev-operator tenant are allowed, so tenant creation is blocked here.'
              : 'Provisioning and destructive tenant operations stay isolated here so they never compete with member, probe, or audit work.'}
          </div>
        </div>
      </CompactPanel>

      <OperationPanel
        description="Destructive actions are isolated and require explicit confirmation."
        onRun={onRun}
        operations={dangerOps}
        processingAction={processingAction}
        title="Danger Zone"
      />
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
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${toneBadgeClass(tone)}`}
    >
      {label}
    </span>
  )
}

function WorkflowActionPanel({
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

function WorkflowProbesTab({
  allowUnauthorizedMode,
  context,
  copyText,
  customers,
  expenses,
  inspectableTenants,
  invoices,
  members,
  onAllowUnauthorizedModeChange,
  onChangeProbeType,
  onRun,
  onSelectActor,
  onSelectRecord,
  onSelectTenant,
  probeType,
  processingAction,
  selectedCustomer,
  selectedExpense,
  selectedInvoice,
  selectedRecord,
}: {
  allowUnauthorizedMode: boolean
  context: Props['inspector']['context']
  copyText: (value: string) => void
  customers: Props['inspector']['customers']
  expenses: Props['inspector']['expenses']
  inspectableTenants: Props['inspector']['inspectableTenants']
  invoices: Props['inspector']['invoices']
  members: Props['inspector']['members']
  onAllowUnauthorizedModeChange: (value: boolean) => void
  onChangeProbeType: (value: ProbeType) => void
  onRun: (
    action: string,
    extra?: Record<string, string>,
    tone?: ActionTone,
    confirmMessage?: string
  ) => void
  onSelectActor: (memberId: string) => void
  onSelectRecord: (recordId: string) => void
  onSelectTenant: (tenantId: string) => void
  probeType: ProbeType
  processingAction: null | string
  selectedCustomer: null | Props['inspector']['customers'][number]
  selectedExpense: null | Props['inspector']['expenses'][number]
  selectedInvoice: null | Props['inspector']['invoices'][number]
  selectedRecord:
    | null
    | Props['inspector']['customers'][number]
    | Props['inspector']['expenses'][number]
    | Props['inspector']['invoices'][number]
}) {
  const createAction =
    probeType === 'invoices'
      ? { action: 'create-invoice-test', label: 'Create draft' }
      : probeType === 'expenses'
        ? { action: 'create-expense-test', label: 'Create expense' }
        : { action: 'create-customer-batch', label: 'Create customer' }

  return (
    <div className="space-y-3">
      <CompactPanel title="Workflow Probes">
        <div className="grid gap-2 xl:grid-cols-[220px_260px_220px_auto_auto]">
          <label className="space-y-1.5">
            <span className={labelClass}>Selected actor</span>
            <select
              className={inputClass()}
              onChange={(event) => onSelectActor(event.target.value)}
              value={context.selectedMemberId}
            >
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} ({member.role})
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className={labelClass}>Selected tenant</span>
            <select
              className={inputClass()}
              onChange={(event) => onSelectTenant(event.target.value)}
              value={context.selectedTenantId}
            >
              {inspectableTenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                  {tenant.isSessionTenant ? ' (session)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className={labelClass}>Unauthorized mode</span>
            <button
              className={`${buttonClass('secondary')} w-full`}
              onClick={() => onAllowUnauthorizedModeChange(!allowUnauthorizedMode)}
              type="button"
            >
              {allowUnauthorizedMode ? 'Enabled' : 'Disabled'}
            </button>
          </label>
          <div className="flex items-end">
            <button
              className={`${buttonClass()} w-full`}
              disabled={processingAction === createAction.action}
              onClick={() => onRun(createAction.action, { count: '1' })}
              type="button"
            >
              {processingAction === createAction.action ? 'Running...' : createAction.label}
            </button>
          </div>
          <div className="flex items-end rounded-xl border border-outline-variant/12 bg-surface-container-low px-3 py-2.5 text-sm text-on-surface-variant">
            Run mutations as the selected scenario actor inside the selected tenant.
          </div>
        </div>
      </CompactPanel>

      <nav className="sticky top-[8.2rem] z-10 flex gap-2 overflow-x-auto rounded-2xl border border-outline-variant/12 bg-surface-container-lowest/95 p-2 backdrop-blur-md">
        {(
          [
            ['invoices', 'Invoices'],
            ['expenses', 'Expenses'],
            ['customers', 'Customers'],
          ] as const
        ).map(([id, label]) => {
          const active = probeType === id
          const count =
            id === 'invoices'
              ? invoices.length
              : id === 'expenses'
                ? expenses.length
                : customers.length
          return (
            <button
              className={`flex min-w-[160px] items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                active
                  ? 'bg-on-surface text-background'
                  : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
              }`}
              key={id}
              onClick={() => onChangeProbeType(id)}
              type="button"
            >
              <span>{label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] ${active ? 'bg-background/15 text-background' : 'bg-surface-container-low text-on-surface-variant'}`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </nav>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_380px]">
        <WorkflowRecordTable
          customers={customers}
          expenses={expenses}
          invoices={invoices}
          onSelectRecord={onSelectRecord}
          probeType={probeType}
          selectedCustomer={selectedCustomer}
          selectedExpense={selectedExpense}
          selectedInvoice={selectedInvoice}
        />

        <WorkflowActionPanel
          allowUnauthorizedMode={allowUnauthorizedMode}
          copyText={copyText}
          onRun={onRun}
          probeType={probeType}
          processingAction={processingAction}
          record={selectedRecord}
          selectedPermissions={context.selectedMemberPermissions}
        />
      </div>
    </div>
  )
}

function WorkflowRecordTable({
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

const labelClass = 'text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant'

function copyButtonClass() {
  return 'rounded-md border border-outline-variant/18 bg-surface-container-low px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-on-surface transition-colors hover:bg-surface-container'
}

function CreateTenantModal({
  onClose,
  onSubmit,
  processingAction,
}: {
  onClose: () => void
  onSubmit: (payload: Record<string, string>) => void
  processingAction: null | string
}) {
  const [ownerEmail, setOwnerEmail] = useState('')
  const [tenantName, setTenantName] = useState('')
  const [ownerPassword, setOwnerPassword] = useState('SecureP@ss123')
  const [passwordConfirmation, setPasswordConfirmation] = useState('SecureP@ss123')
  const [seedMode, setSeedMode] = useState<'empty' | 'seeded'>('seeded')

  return (
    <Modal onClose={onClose} open size="md" title="Create tenant">
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1.5">
            <span className={labelClass}>Owner email</span>
            <input
              className={inputClass()}
              onChange={(event) => setOwnerEmail(event.target.value)}
              placeholder="owner@example.local"
              value={ownerEmail}
            />
          </label>
          <label className="space-y-1.5">
            <span className={labelClass}>Tenant name</span>
            <input
              className={inputClass()}
              onChange={(event) => setTenantName(event.target.value)}
              placeholder="Ledger Forge Demo"
              value={tenantName}
            />
          </label>
          <label className="space-y-1.5">
            <span className={labelClass}>Owner password</span>
            <input
              className={inputClass()}
              onChange={(event) => setOwnerPassword(event.target.value)}
              type="password"
              value={ownerPassword}
            />
          </label>
          <label className="space-y-1.5">
            <span className={labelClass}>Confirm password</span>
            <input
              className={inputClass()}
              onChange={(event) => setPasswordConfirmation(event.target.value)}
              type="password"
              value={passwordConfirmation}
            />
          </label>
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <button
            className={`${buttonClass(seedMode === 'empty' ? 'primary' : 'secondary')} w-full`}
            onClick={() => setSeedMode('empty')}
            type="button"
          >
            Empty tenant
          </button>
          <button
            className={`${buttonClass(seedMode === 'seeded' ? 'primary' : 'secondary')} w-full`}
            onClick={() => setSeedMode('seeded')}
            type="button"
          >
            Seeded tenant
          </button>
        </div>

        <div className="rounded-xl border border-outline-variant/12 bg-surface-container-low px-3 py-2.5 text-sm text-on-surface-variant">
          The dev operator stays in its own session tenant. This modal creates a separate tenant
          with a real owner account and optional demo data.
        </div>

        <div className="flex justify-end gap-2">
          <button className={buttonClass('secondary')} onClick={onClose} type="button">
            Cancel
          </button>
          <button
            className={buttonClass()}
            disabled={processingAction === 'create-tenant'}
            onClick={() =>
              onSubmit({
                ownerEmail,
                ownerPassword,
                passwordConfirmation,
                seedMode,
                tenantName,
              })
            }
            type="button"
          >
            {processingAction === 'create-tenant' ? 'Creating...' : 'Create tenant'}
          </button>
        </div>
      </div>
    </Modal>
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
      tone: 'secondary' as const,
    },
    {
      allowed: permissions.accountingWriteDrafts,
      extra: { customerId },
      id: 'delete-customer',
      label: 'Delete customer',
      reason: permissions.accountingWriteDrafts
        ? 'Delete path available unless invoices are linked.'
        : 'Draft write permission is missing.',
      tone: 'danger' as const,
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
      tone: 'primary' as const,
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
      tone: 'danger' as const,
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
      tone: 'danger' as const,
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
      tone: 'secondary' as const,
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
      tone: 'primary' as const,
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
      tone: 'primary' as const,
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
      tone: 'danger' as const,
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
      tone: 'danger' as const,
    },
  ]
}

function OperationPanel({
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

function rowActionButtonClass() {
  return 'rounded-lg border border-outline-variant/18 bg-surface-container-low px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface transition-colors hover:bg-surface-container'
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
