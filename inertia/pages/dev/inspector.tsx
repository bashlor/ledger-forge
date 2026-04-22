import type { ReactNode } from 'react'

import { Link } from '@adonisjs/inertia/react'
import { Head, router } from '@inertiajs/react'
import { useDeferredValue, useState } from 'react'

import { DataTable } from '~/components/data_table'
import { Modal } from '~/components/modal'
import { StatusBadge } from '~/components/status_badge'
import { formatCurrency, formatShortDate } from '~/lib/format'

import type { InertiaProps } from '../../types'

type ActionTone = 'danger' | 'primary' | 'secondary'

type DialogState =
  | null
  | { id: string; kind: 'expense' }
  | { id: string; kind: 'invoice' }
  | { id: string; kind: 'member' }

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
      activeTenantId: string
      activeTenantName: string
      activeTenantSlug: string
      currentRole: 'admin' | 'member' | 'owner' | null
      environment: 'development'
      isAnonymous: boolean
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
      selectedMemberName: string
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
      selectedMemberRole: 'admin' | 'member' | 'owner' | null
      selectedTenantId: string
      selectedTenantName: string
      sessionTenant: {
        id: string
        name: string
        slug: string
      }
      userEmail: string
      userName: string
      userPublicId: string
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
  }
}>

export default function DevInspectorPage({ inspector }: Props) {
  const [processingAction, setProcessingAction] = useState<null | string>(null)
  const [dialogState, setDialogState] = useState<DialogState>(null)
  const [memberSearch, setMemberSearch] = useState('')
  const [memberRoleFilter, setMemberRoleFilter] = useState<'admin' | 'all' | 'member' | 'owner'>(
    'all'
  )
  const [memberStatusFilter, setMemberStatusFilter] = useState<'active' | 'all' | 'inactive'>('all')
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
  } = inspector
  const deferredMemberSearch = useDeferredValue(memberSearch)
  const selectedMembership = memberships.find(
    (membership) => membership.organizationId === context.selectedTenantId
  )
  const activeMember =
    dialogState?.kind === 'member'
      ? (members.find((member) => member.id === dialogState.id) ?? null)
      : null
  const activeInvoice =
    dialogState?.kind === 'invoice'
      ? (invoices.find((invoice) => invoice.id === dialogState.id) ?? null)
      : null
  const activeExpense =
    dialogState?.kind === 'expense'
      ? (expenses.find((expense) => expense.id === dialogState.id) ?? null)
      : null
  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      !deferredMemberSearch.trim() ||
      `${member.name} ${member.email} ${member.userId}`
        .toLowerCase()
        .includes(deferredMemberSearch.trim().toLowerCase())
    const matchesRole = memberRoleFilter === 'all' || member.role === memberRoleFilter
    const matchesStatus =
      memberStatusFilter === 'all' ||
      (memberStatusFilter === 'active' ? member.isActive : !member.isActive)

    return matchesSearch && matchesRole && matchesStatus
  })
  const tenantFactoryOps = globalOperations.filter(
    (operation) => operation.section === 'tenant_factory'
  )
  const dangerOps = globalOperations.filter((operation) => operation.section === 'danger_zone')

  function baseSelection() {
    return {
      memberId: context.selectedMemberId,
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

  function refreshSelection(next: { memberId?: string; tenantId?: string }) {
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

  function runAction(
    action: string,
    extra: Record<string, string> = {},
    tone: ActionTone = 'primary'
  ) {
    const payload = {
      ...auditQuery(),
      ...baseSelection(),
      ...extra,
    }

    setProcessingAction(action)
    router.post(`/_dev/inspector/actions/${action}`, payload as never, {
      onFinish: () => setProcessingAction(null),
      preserveScroll: true,
      preserveState: tone !== 'danger',
    })
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

  function closeDialog() {
    setDialogState(null)
  }

  return (
    <>
      <Head title="Dev Console" />

      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <DevConsoleHeader
          dateLabel={formatLongDate(new Date().toISOString())}
          onRefresh={() => refreshSelection({})}
          operatorEmail={context.operator.email}
          operatorName={context.operator.name}
          readOnlyBadge={context.readOnlyBadge}
        />

        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            <ConsoleSection
              description="Keep provisioning and destructive actions isolated from scenario testing."
              eyebrow="Global operations"
              title="Tenant Factory"
            >
              <OperationStack
                onRun={runAction}
                operations={tenantFactoryOps}
                processingAction={processingAction}
              />
            </ConsoleSection>

            <ConsoleSection
              description="High-impact actions stay visible, but intentionally separated from the main workspace."
              eyebrow="Danger zone"
              title="Reset Controls"
            >
              <OperationStack
                onRun={runAction}
                operations={dangerOps}
                processingAction={processingAction}
              />
            </ConsoleSection>

            <ConsoleSection
              description="Last console-side audit results for fast manual verification."
              eyebrow="Observability"
              title="Recent Actions"
            >
              <div className="space-y-2">
                {recentActions.length === 0 ? (
                  <EmptyStateCopy text="No console actions recorded yet for the current audit scope." />
                ) : (
                  recentActions.map((action) => (
                    <div
                      className="rounded-xl border border-outline-variant/15 bg-surface-container-low px-3 py-3"
                      key={action.id}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-semibold text-on-surface">
                          {humanizeAuditAction(action.action)}
                        </p>
                        <ToneBadge label={action.result} tone={toneForAuditResult(action.result)} />
                      </div>
                      <p className="mt-1 text-xs text-on-surface-variant">
                        {formatTimestamp(action.timestamp)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </ConsoleSection>
          </aside>

          <main className="min-w-0 space-y-6">
            <ConsoleSection
              description="The dev operator is technical only. The current scenario actor carries the business permissions."
              eyebrow="Context testing"
              title="Tenant Context"
            >
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
                <div className="space-y-4 rounded-2xl border border-outline-variant/15 bg-surface-container-low px-4 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <ToneBadge label={context.readOnlyBadge} tone="warning" />
                    <ToneBadge label={`Environment: ${context.environment}`} tone="info" />
                    <ToneBadge label={`Access mode: ${context.accessMode}`} tone="neutral" />
                    {selectedMembership?.isActive === false ? (
                      <ToneBadge label="Selected membership inactive" tone="danger" />
                    ) : null}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <ContextItem label="Current operator" value={context.operator.name} />
                    <ContextItem label="Operator email" value={context.operator.email} />
                    <ContextItem label="Session tenant" value={context.sessionTenant.name} />
                    <ContextItem label="Scenario tenant" value={context.scenario.tenantName} />
                    <ContextItem
                      label="Scenario actor"
                      value={
                        context.scenario.actorRole
                          ? `${context.scenario.actorName} (${context.scenario.actorRole})`
                          : context.scenario.actorName
                      }
                    />
                    <ContextItem
                      label="Operator membership"
                      value={context.operator.membershipRole ?? 'none'}
                    />
                    <ContextItem label="Workspace slug" value={context.scenario.tenantSlug} />
                    <ContextItem
                      label="Operator public id"
                      mono
                      value={context.operator.publicId}
                    />
                  </div>

                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                    <label className="space-y-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                        Scenario tenant
                      </span>
                      <select
                        className={inputClass()}
                        onChange={(event) =>
                          refreshSelection({ memberId: '', tenantId: event.target.value })
                        }
                        value={context.selectedTenantId}
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
                        onClick={() => switchTenant(context.selectedTenantId)}
                        type="button"
                      >
                        {processingAction === `switch:${context.selectedTenantId}`
                          ? 'Switching...'
                          : 'Make session tenant active'}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-semibold text-on-surface">Rules in play</h2>
                        <p className="mt-1 text-sm text-on-surface-variant">
                          Permission chips describe the selected scenario actor, not the dev
                          operator.
                        </p>
                      </div>
                      <div className="rounded-full border border-outline-variant/15 bg-surface-container-low px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                        Business actor sandbox
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
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <MetricCard label="Invoices" value={metrics.invoices} />
                    <MetricCard label="Expenses" value={metrics.expenses} />
                    <MetricCard label="Customers" value={metrics.customers} />
                    <MetricCard label="Members" value={metrics.members} />
                    <MetricCard label="Audit events" value={metrics.auditEvents} />
                  </div>

                  <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-low px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                      Last run status
                    </p>
                    {recentActions[0] ? (
                      <div className="mt-3 space-y-2">
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
                      <EmptyStateCopy text="Run a console action to establish the first baseline event." />
                    )}
                  </div>
                </div>
              </div>
            </ConsoleSection>

            <ConsoleSection
              description="Step 1 keeps generators compact and visible. Full parameterized forms land in Step 3."
              eyebrow="Global dataset operations"
              title="Scenario Generators"
            >
              <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
                <GeneratorCard
                  action="create-invoice-test"
                  description="Creates a compact invoice batch against the current scenario tenant."
                  label="Invoice batch"
                  onRun={runAction}
                  processingAction={processingAction}
                />
                <GeneratorCard
                  action="create-expense-test"
                  description="Generates varied expenses for quick accounting rule probes."
                  label="Expense batch"
                  onRun={runAction}
                  processingAction={processingAction}
                />
                <GeneratorCard
                  action="create-customer-batch"
                  description="Adds customers to support draft and issued invoice paths."
                  label="Customer batch"
                  onRun={runAction}
                  processingAction={processingAction}
                />
                <GeneratorCard
                  action="generate-demo-data"
                  description="Seeds a broader demo dataset in the selected tenant for end-to-end manual checks."
                  label="Full demo dataset"
                  onRun={runAction}
                  processingAction={processingAction}
                />
              </div>
            </ConsoleSection>

            <DataTable
              emptyMessage="No memberships match the current filters."
              headerContent={
                <div className="flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
                  <span>Rows stay compact so role and status differences scan quickly.</span>
                  <span>Owner rules stay explicit until the drawer migration in Step 2.</span>
                </div>
              }
              isEmpty={filteredMembers.length === 0}
              title="Members"
            >
              <div className="border-b border-outline-variant/10 bg-surface-container-low px-4 py-3">
                <div className="grid gap-2 md:grid-cols-[minmax(0,1.4fr)_180px_180px]">
                  <input
                    className={inputClass()}
                    onChange={(event) => setMemberSearch(event.target.value)}
                    placeholder="Search name, email, or user id"
                    value={memberSearch}
                  />
                  <select
                    className={inputClass()}
                    onChange={(event) =>
                      setMemberRoleFilter(event.target.value as typeof memberRoleFilter)
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
                      setMemberStatusFilter(event.target.value as typeof memberStatusFilter)
                    }
                    value={memberStatusFilter}
                  >
                    <option value="all">All statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <ScrollableTable>
                <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-outline-variant/15 bg-surface-container-low text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                      <th className="px-4 py-2.5">Name</th>
                      <th className="px-4 py-2.5">Email</th>
                      <th className="px-4 py-2.5">Role</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5">Tenant</th>
                      <th className="px-4 py-2.5">Scenario</th>
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
                        onClick={() => setDialogState({ id: member.id, kind: 'member' })}
                      >
                        <td className="px-4 py-3 font-medium text-on-surface">{member.name}</td>
                        <td className="px-4 py-3 text-on-surface-variant">{member.email}</td>
                        <td className="px-4 py-3">
                          <RoleBadge role={member.role} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={member.isActive ? 'confirmed' : 'overdue'} />
                        </td>
                        <td className="px-4 py-3 text-on-surface-variant">
                          {context.scenario.tenantName}
                        </td>
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

            <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <DataTable
                emptyMessage="No invoices exist for the selected tenant."
                headerContent={
                  <span className="text-xs text-on-surface-variant">
                    Step 1 keeps record probes in compact tables. Step 4 centralizes them in a
                    dedicated mutation panel.
                  </span>
                }
                isEmpty={invoices.length === 0}
                title="Invoices"
              >
                <ScrollableTable maxHeightClass="max-h-[24rem]">
                  <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                    <thead className="sticky top-0 z-10">
                      <tr className="border-b border-outline-variant/15 bg-surface-container-low text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                        <th className="px-4 py-2.5">Invoice</th>
                        <th className="px-4 py-2.5">Customer</th>
                        <th className="px-4 py-2.5">Status</th>
                        <th className="px-4 py-2.5">Window</th>
                        <th className="px-4 py-2.5 text-right">Total</th>
                        <th className="px-4 py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                      {invoices.map((invoice) => (
                        <tr
                          className="cursor-pointer transition-colors hover:bg-surface-container-low/70"
                          key={invoice.id}
                          onClick={() => setDialogState({ id: invoice.id, kind: 'invoice' })}
                        >
                          <td className="px-4 py-3 font-medium text-on-surface">
                            {invoice.invoiceNumber}
                          </td>
                          <td className="px-4 py-3 text-on-surface-variant">
                            {invoice.customerCompanyName}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={invoice.status} />
                          </td>
                          <td className="px-4 py-3 text-on-surface-variant">
                            {formatShortDate(invoice.issueDate)} to{' '}
                            {formatShortDate(invoice.dueDate)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums text-on-surface">
                            {formatMoney(invoice.totalInclTaxCents)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button className={rowActionButtonClass()} type="button">
                              Probe
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollableTable>
              </DataTable>

              <DataTable
                emptyMessage="No expenses exist for the selected tenant."
                headerContent={
                  <span className="text-xs text-on-surface-variant">
                    The current probes stay intentionally visible, including paths expected to fail.
                  </span>
                }
                isEmpty={expenses.length === 0}
                title="Expenses"
              >
                <ScrollableTable maxHeightClass="max-h-[24rem]">
                  <table className="w-full min-w-[700px] border-collapse text-left text-sm">
                    <thead className="sticky top-0 z-10">
                      <tr className="border-b border-outline-variant/15 bg-surface-container-low text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                        <th className="px-4 py-2.5">Expense</th>
                        <th className="px-4 py-2.5">Category</th>
                        <th className="px-4 py-2.5">Date</th>
                        <th className="px-4 py-2.5">Status</th>
                        <th className="px-4 py-2.5 text-right">Amount</th>
                        <th className="px-4 py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                      {expenses.map((expense) => (
                        <tr
                          className="cursor-pointer transition-colors hover:bg-surface-container-low/70"
                          key={expense.id}
                          onClick={() => setDialogState({ id: expense.id, kind: 'expense' })}
                        >
                          <td className="px-4 py-3 font-medium text-on-surface">{expense.label}</td>
                          <td className="px-4 py-3 text-on-surface-variant">{expense.category}</td>
                          <td className="px-4 py-3 text-on-surface-variant">
                            {formatShortDate(expense.date)}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={expense.status} />
                          </td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums text-on-surface">
                            {formatMoney(expense.amountCents)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button className={rowActionButtonClass()} type="button">
                              Probe
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollableTable>
              </DataTable>
            </div>

            <DataTable
              emptyMessage="No customers exist for the selected tenant."
              isEmpty={customers.length === 0}
              title="Customers"
            >
              <ScrollableTable maxHeightClass="max-h-[18rem]">
                <table className="w-full min-w-[820px] border-collapse text-left text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-outline-variant/15 bg-surface-container-low text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                      <th className="px-4 py-2.5">Company</th>
                      <th className="px-4 py-2.5">Contact</th>
                      <th className="px-4 py-2.5">Email</th>
                      <th className="px-4 py-2.5">Phone</th>
                      <th className="px-4 py-2.5">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {customers.map((customer) => (
                      <tr key={customer.id}>
                        <td className="px-4 py-3 font-medium text-on-surface">
                          {customer.company}
                        </td>
                        <td className="px-4 py-3 text-on-surface-variant">{customer.name}</td>
                        <td className="px-4 py-3 text-on-surface-variant">{customer.email}</td>
                        <td className="px-4 py-3 text-on-surface-variant">{customer.phone}</td>
                        <td className="px-4 py-3 text-on-surface-variant">
                          {formatTimestamp(customer.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollableTable>
            </DataTable>

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
                        action: String(formData.get('action') ?? ''),
                        actorId: String(formData.get('actorId') ?? ''),
                        memberId: context.selectedMemberId,
                        tenantId: String(formData.get('tenantId') ?? context.selectedTenantId),
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
                  <select
                    className={inputClass()}
                    defaultValue={audit.filters.actorId}
                    name="actorId"
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
                    defaultValue={audit.filters.tenantId}
                    name="tenantId"
                  >
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
              <ScrollableTable maxHeightClass="max-h-[28rem]">
                <table className="w-full min-w-[960px] border-collapse text-left text-sm">
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
                        <td className="px-4 py-3 text-on-surface-variant">
                          {event.organizationName}
                        </td>
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
          </main>
        </div>

        <Modal
          description="Member workflows move to a right-hand drawer in Step 2. Step 1 keeps the role and status probes together while the page hierarchy is rebuilt."
          footer={
            activeMember ? (
              <>
                <button className={buttonClass('secondary')} onClick={closeDialog} type="button">
                  Close
                </button>
                <button
                  className={buttonClass('secondary')}
                  disabled={activeMember.id === context.selectedMemberId}
                  onClick={() => {
                    closeDialog()
                    refreshSelection({ memberId: activeMember.id })
                  }}
                  type="button"
                >
                  {activeMember.id === context.selectedMemberId
                    ? 'Current scenario actor'
                    : 'Set as scenario actor'}
                </button>
                <button
                  className={buttonClass(activeMember.isActive ? 'danger' : 'primary')}
                  disabled={processingAction === 'toggle-member-active'}
                  onClick={() => runAction('toggle-member-active', { memberId: activeMember.id })}
                  type="button"
                >
                  {processingAction === 'toggle-member-active'
                    ? 'Running...'
                    : activeMember.isActive
                      ? 'Deactivate member'
                      : 'Activate member'}
                </button>
                <button
                  className={buttonClass()}
                  disabled={processingAction === 'change-member-role'}
                  onClick={() => runAction('change-member-role', { memberId: activeMember.id })}
                  type="button"
                >
                  {processingAction === 'change-member-role'
                    ? 'Running...'
                    : activeMember.role === 'admin'
                      ? 'Demote to member'
                      : 'Promote to admin'}
                </button>
              </>
            ) : undefined
          }
          onClose={closeDialog}
          open={Boolean(activeMember)}
          size="md"
          title={activeMember ? activeMember.name : 'Member actions'}
        >
          {activeMember ? (
            <div className="space-y-5">
              <DetailList>
                <DetailRow label="Identity" value={activeMember.name} />
                <DetailRow label="Email" value={activeMember.email} />
                <DetailRow label="Tenant" value={context.scenario.tenantName} />
                <DetailRow label="Role" value={activeMember.role} />
                <DetailRow label="Status" value={activeMember.isActive ? 'active' : 'inactive'} />
                <DetailRow label="User id" value={activeMember.userId} />
              </DetailList>

              <CompatibilityBlock
                items={[
                  activeMember.role === 'owner'
                    ? 'Owner cannot be demoted or deactivated. The action stays visible so the restriction remains explicit.'
                    : 'Non-owner members remain mutable when the selected scenario actor has the required permissions.',
                  activeMember.id === context.selectedMemberId
                    ? 'Self-targeting flows remain important because self-deactivation should be blocked.'
                    : 'Set this row as the scenario actor before running cross-role checks elsewhere in the console.',
                ]}
                title="Rules preview"
              />
            </div>
          ) : null}
        </Modal>

        <Modal
          description="Invoice probes stay modal-based in Step 1 while the workspace hierarchy is rebuilt around clearer sections."
          footer={
            activeInvoice ? (
              <>
                <button className={buttonClass('secondary')} onClick={closeDialog} type="button">
                  Close
                </button>
                <button
                  className={buttonClass('secondary')}
                  disabled={processingAction === 'update-invoice-draft'}
                  onClick={() => runAction('update-invoice-draft', { invoiceId: activeInvoice.id })}
                  type="button"
                >
                  {processingAction === 'update-invoice-draft' ? 'Running...' : 'Edit draft'}
                </button>
                <button
                  className={buttonClass()}
                  disabled={processingAction === 'change-invoice-status'}
                  onClick={() =>
                    runAction('change-invoice-status', { invoiceId: activeInvoice.id })
                  }
                  type="button"
                >
                  {processingAction === 'change-invoice-status'
                    ? 'Running...'
                    : activeInvoice.status === 'draft'
                      ? 'Issue invoice'
                      : activeInvoice.status === 'issued'
                        ? 'Mark paid'
                        : 'Advance status'}
                </button>
                <button
                  className={buttonClass('danger')}
                  disabled={processingAction === 'delete-invoice'}
                  onClick={() =>
                    runAction('delete-invoice', { invoiceId: activeInvoice.id }, 'danger')
                  }
                  type="button"
                >
                  {processingAction === 'delete-invoice' ? 'Running...' : 'Delete as draft'}
                </button>
              </>
            ) : undefined
          }
          onClose={closeDialog}
          open={Boolean(activeInvoice)}
          size="lg"
          title={activeInvoice ? activeInvoice.invoiceNumber : 'Invoice actions'}
        >
          {activeInvoice ? (
            <div className="space-y-5">
              <DetailList>
                <DetailRow label="Customer" value={activeInvoice.customerCompanyName} />
                <DetailRow label="Status" value={activeInvoice.status} />
                <DetailRow
                  label="Date window"
                  value={`${formatShortDate(activeInvoice.issueDate)} to ${formatShortDate(activeInvoice.dueDate)}`}
                />
                <DetailRow label="Total" value={formatMoney(activeInvoice.totalInclTaxCents)} />
              </DetailList>

              <CompatibilityBlock
                items={
                  activeInvoice.status === 'draft'
                    ? [
                        'Draft compatibility: edit, issue, and delete remain the expected happy-path actions.',
                        'If issue permission is missing, the action should still fail visibly instead of disappearing.',
                      ]
                    : activeInvoice.status === 'issued'
                      ? [
                          'Issued compatibility: advancing status should mark the invoice as paid when the selected actor is allowed.',
                          'Deleting as a draft should fail because the record has already left the draft state.',
                        ]
                      : [
                          'Paid compatibility: the record is terminal and draft-only actions should fail.',
                          'This keeps denied flows demonstrable instead of quietly hiding them.',
                        ]
                }
                title="Compatibility notes"
              />
            </div>
          ) : null}
        </Modal>

        <Modal
          description="Expense deletion probes remain visible because confirmed-expense denial is one of the important manual checks."
          footer={
            activeExpense ? (
              <>
                <button className={buttonClass('secondary')} onClick={closeDialog} type="button">
                  Close
                </button>
                <button
                  className={buttonClass('danger')}
                  disabled={
                    processingAction === 'delete-confirmed-expense' ||
                    processingAction === 'delete-expense'
                  }
                  onClick={() =>
                    runAction(
                      activeExpense.status === 'confirmed'
                        ? 'delete-confirmed-expense'
                        : 'delete-expense',
                      { expenseId: activeExpense.id },
                      'danger'
                    )
                  }
                  type="button"
                >
                  {processingAction === 'delete-confirmed-expense' ||
                  processingAction === 'delete-expense'
                    ? 'Running...'
                    : activeExpense.status === 'confirmed'
                      ? 'Attempt delete confirmed expense'
                      : 'Delete draft expense'}
                </button>
              </>
            ) : undefined
          }
          onClose={closeDialog}
          open={Boolean(activeExpense)}
          size="md"
          title={activeExpense ? activeExpense.label : 'Expense actions'}
        >
          {activeExpense ? (
            <div className="space-y-5">
              <DetailList>
                <DetailRow label="Category" value={activeExpense.category} />
                <DetailRow label="Status" value={activeExpense.status} />
                <DetailRow label="Date" value={formatShortDate(activeExpense.date)} />
                <DetailRow label="Amount" value={formatMoney(activeExpense.amountCents)} />
              </DetailList>

              <CompatibilityBlock
                items={
                  activeExpense.status === 'draft'
                    ? [
                        'Draft compatibility: deletion is valid if the selected actor can write drafts.',
                        'Any failure here should come from permission or isolation rules, not the record state itself.',
                      ]
                    : [
                        'Confirmed compatibility: deletion should fail and remain demonstrable.',
                        'The rejected path stays visible because hidden errors are bad tooling.',
                      ]
                }
                title="Compatibility notes"
              />
            </div>
          ) : null}
        </Modal>
      </div>
    </>
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

function ConsoleSection({
  children,
  description,
  eyebrow,
  title,
}: {
  children: ReactNode
  description?: string
  eyebrow?: string
  title: string
}) {
  return (
    <section className="rounded-[24px] border border-outline-variant/18 bg-surface-container-lowest shadow-ambient-tight">
      <div className="border-b border-outline-variant/10 px-4 py-4 sm:px-5">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
            {eyebrow}
          </p>
        ) : null}
        <div className={eyebrow ? 'mt-2' : ''}>
          <h2 className="font-headline text-[1.7rem] font-extrabold tracking-tight text-on-surface">
            {title}
          </h2>
          {description ? (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="px-4 py-4 sm:px-5">{children}</div>
    </section>
  )
}

function ContextItem({
  label,
  mono = false,
  value,
}: {
  label: string
  mono?: boolean
  value: string
}) {
  return (
    <div className="rounded-2xl border border-outline-variant/12 bg-surface-container-lowest px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
        {label}
      </p>
      <p className={`mt-2 text-sm text-on-surface ${mono ? 'font-mono text-xs' : 'font-medium'}`}>
        {value}
      </p>
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,0.45fr)_minmax(0,0.55fr)] gap-4 border-b border-outline-variant/10 px-4 py-4 last:border-b-0">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
        {label}
      </div>
      <div className="text-right text-sm font-medium text-on-surface">{value}</div>
    </div>
  )
}

function DevConsoleHeader({
  dateLabel,
  onRefresh,
  operatorEmail,
  operatorName,
  readOnlyBadge,
}: {
  dateLabel: string
  onRefresh: () => void
  operatorEmail: string
  operatorName: string
  readOnlyBadge: string
}) {
  return (
    <section className="sticky top-16 z-30 rounded-[24px] border border-outline-variant/18 bg-surface-container-lowest/95 shadow-ambient backdrop-blur-md">
      <div className="flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">
              Dev Console
            </h1>
            <ToneBadge label="Development" tone="info" />
            <ToneBadge label={readOnlyBadge} tone="warning" />
          </div>
          <p className="mt-2 text-sm text-on-surface-variant">
            Manual business-rule console for tenant isolation, permissions, audit trail, and
            workflow probes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-low px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
              Current operator
            </p>
            <p className="mt-1 text-sm font-semibold text-on-surface">{operatorName}</p>
            <p className="truncate text-xs text-on-surface-variant">{operatorEmail}</p>
          </div>
          <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-low px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
              Search shortcut
            </p>
            <p className="mt-1 text-sm font-semibold text-on-surface">Cmd/Ctrl + K</p>
          </div>
          <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-low px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
              Date
            </p>
            <p className="mt-1 text-sm font-semibold text-on-surface">{dateLabel}</p>
          </div>
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
  description,
  label,
  onRun,
  processingAction,
}: {
  action: string
  description: string
  label: string
  onRun: (action: string, extra?: Record<string, string>, tone?: ActionTone) => void
  processingAction: null | string
}) {
  return (
    <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-low px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
        Dataset generator
      </p>
      <h3 className="mt-2 text-lg font-semibold text-on-surface">{label}</h3>
      <p className="mt-2 text-sm leading-6 text-on-surface-variant">{description}</p>
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

function humanizeAuditAction(action: string) {
  return action.replaceAll('_', ' ')
}

function inputClass() {
  return 'w-full rounded-xl border border-outline-variant/20 bg-surface-container-low px-3 py-2.5 text-sm text-on-surface outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary/30'
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-low px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
        {label}
      </p>
      <p className="mt-2 text-2xl font-extrabold tabular-nums text-on-surface">{value}</p>
    </div>
  )
}

function OperationStack({
  onRun,
  operations,
  processingAction,
}: {
  onRun: (action: string, extra?: Record<string, string>, tone?: ActionTone) => void
  operations: {
    action: null | string
    available: boolean
    id: string
    impact: string
    label: string
    tone: 'danger' | 'neutral'
  }[]
  processingAction: null | string
}) {
  return (
    <div className="space-y-3">
      {operations.map((operation) => {
        const tone = operation.tone === 'danger' ? 'danger' : 'secondary'
        return (
          <div
            className="rounded-2xl border border-outline-variant/15 bg-surface-container-low px-4 py-4"
            key={operation.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-on-surface">{operation.label}</h3>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">{operation.impact}</p>
              </div>
              <button
                className={`${buttonClass(tone)} shrink-0`}
                disabled={
                  !operation.available || !operation.action || processingAction === operation.action
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

function RoleBadge({ role }: { role: 'admin' | 'member' | 'owner' }) {
  const tone = role === 'owner' ? 'warning' : role === 'admin' ? 'info' : 'neutral'

  return <ToneBadge label={role} tone={tone} />
}

function rowActionButtonClass() {
  return 'rounded-lg border border-outline-variant/20 bg-surface-container-low px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-on-surface transition-colors hover:bg-surface-container'
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
