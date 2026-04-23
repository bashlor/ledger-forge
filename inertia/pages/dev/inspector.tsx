import { Head, router } from '@inertiajs/react'
import { startTransition, useEffect, useState } from 'react'

import type { ActionTone, DevConsoleTab, Props } from './inspector_types'

import {
  AuditEventDrawer,
  CommandPalette,
  CreateTenantModal,
  DevInspectorHeaderShell,
  MemberDrawer,
} from './inspector_overlays'
import {
  AuditTrailSection,
  DataGeneratorSection,
  MembersPermissionsSection,
  OverviewSection,
  TenantFactorySection,
  WorkflowProbesSection,
} from './inspector_sections'

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
        <DevInspectorHeaderShell
          activeTab={view.activeTab}
          counts={tabCounts}
          onChangeTab={setActiveTab}
          onRefresh={() => refreshSelection()}
          operatorEmail={context.operator.email}
          operatorName={context.operator.name}
          readOnlyBadge={context.readOnlyBadge}
        />

        {view.activeTab === 'overview' ? (
          <OverviewSection
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
          <TenantFactorySection
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
          <MembersPermissionsSection
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
          <DataGeneratorSection
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
          <WorkflowProbesSection
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
          <AuditTrailSection
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
