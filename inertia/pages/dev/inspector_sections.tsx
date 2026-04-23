import { useState } from 'react'

import { DataTable } from '~/components/data_table'
import { StatusBadge } from '~/components/status_badge'
import { formatShortDate } from '~/lib/format'

import type {
  ActionTone,
  MemberRoleFilter,
  MemberStatusFilter,
  ProbeType,
  Props,
} from './inspector_types'

import {
  ActivityList,
  EmptyStateCopy,
  formatMoney,
  formatTimestamp,
  GeneratorCard,
  humanizeAuditAction,
  MetricCard,
} from './inspector_display_helpers'
import {
  buttonClass,
  CompactPanel,
  inputClass,
  labelClass,
  OperationPanel,
  PermissionChip,
  RoleBadge,
  rowActionButtonClass,
  ScrollableTable,
  ToneBadge,
  toneForAuditResult,
} from './inspector_ui_primitives'
import { WorkflowActionPanel, WorkflowRecordTable } from './inspector_workflow_helpers'

export function AuditTrailSection({
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

export function DataGeneratorSection({
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

export function MembersPermissionsSection({
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

export function OverviewSection({
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
          <div className="overflow-hidden rounded-xl border border-outline-variant/12 bg-surface-container-low">
            <div className="grid grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)] gap-4 border-b border-outline-variant/10 px-3 py-2.5 last:border-b-0">
              <div className={labelClass}>Session tenant</div>
              <div className="text-right text-sm font-medium text-on-surface">
                {context.sessionTenant.name}
              </div>
            </div>
            <div className="grid grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)] gap-4 border-b border-outline-variant/10 px-3 py-2.5 last:border-b-0">
              <div className={labelClass}>Active actor</div>
              <div className="text-right text-sm font-medium text-on-surface">
                {context.scenario.actorName}
              </div>
            </div>
            <div className="grid grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)] gap-4 border-b border-outline-variant/10 px-3 py-2.5 last:border-b-0">
              <div className={labelClass}>Current role</div>
              <div className="text-right text-sm font-medium text-on-surface">
                {context.scenario.actorRole ?? 'none'}
              </div>
            </div>
            <div className="grid grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)] gap-4 px-3 py-2.5">
              <div className={labelClass}>Make active</div>
              <div className="text-right text-sm font-medium text-on-surface">
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
          </div>

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

export function TenantFactorySection({
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

export function WorkflowProbesSection({
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
