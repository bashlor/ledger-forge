import type { ReactNode } from 'react'

import { Link } from '@adonisjs/inertia/react'
import { Head, router } from '@inertiajs/react'
import { useState } from 'react'

import { DataTable } from '~/components/data_table'
import { Modal } from '~/components/modal'
import { PageHeader } from '~/components/page_header'
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
      activeTenantId: string
      activeTenantName: string
      activeTenantSlug: string
      currentRole: 'admin' | 'member' | 'owner' | null
      environment: 'development'
      isAnonymous: boolean
      readOnlyBadge: string
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
  }
}>

export default function DevInspectorPage({ inspector }: Props) {
  const [processingAction, setProcessingAction] = useState<null | string>(null)
  const [dialogState, setDialogState] = useState<DialogState>(null)
  const { audit, context, customers, expenses, invoices, members, memberships, metrics } = inspector
  const selectedMembership = memberships.find(
    (membership) => membership.organizationId === context.selectedTenantId
  )
  const activeMember =
    dialogState?.kind === 'member'
      ? members.find((member) => member.id === dialogState.id) ?? null
      : null
  const activeInvoice =
    dialogState?.kind === 'invoice'
      ? invoices.find((invoice) => invoice.id === dialogState.id) ?? null
      : null
  const activeExpense =
    dialogState?.kind === 'expense'
      ? expenses.find((expense) => expense.id === dialogState.id) ?? null
      : null

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

  function runAction(action: string, extra: Record<string, string> = {}, tone: ActionTone = 'primary') {
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
      <Head title="Dev Inspector" />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <PageHeader
          actions={
            <>
              <button
                className={buttonClass('secondary')}
                onClick={() => refreshSelection({})}
                type="button"
              >
                Refresh console
              </button>
              <Link className={buttonClass('secondary')} href="/dashboard">
                Open workspace
              </Link>
            </>
          }
          description="Open a member, invoice, or expense from its table to test business-rule compatibility inside focused action modals."
          eyebrow="Development"
          title="Dev Inspector"
        />

        <SectionCard
          description="The app shell now carries navigation and account context. This page stays focused on the current scenario, its tenant data, and the action modals opened from table rows."
          title="Scenario context"
        >
          <div className="flex flex-wrap gap-2">
            <ToneBadge label={context.readOnlyBadge} tone="warning" />
            <ToneBadge label={`Environment: ${context.environment}`} tone="info" />
            {selectedMembership?.isActive === false ? (
              <ToneBadge label="Selected membership inactive" tone="danger" />
            ) : null}
          </div>

          <div className="mt-6 space-y-4">
            <DetailList>
              <DetailRow label="Signed in as" value={context.userName} />
              <DetailRow label="Operator email" value={context.userEmail} />
              <DetailRow label="Session tenant" value={context.activeTenantName} />
              <DetailRow label="Scenario tenant" value={context.selectedTenantName} />
              <DetailRow
                label="Scenario actor"
                value={
                  context.selectedMemberRole
                    ? `${context.selectedMemberName} (${context.selectedMemberRole})`
                    : context.selectedMemberName
                }
              />
              <DetailRow label="Workspace slug" value={context.activeTenantSlug} />
              <DetailRow label="Operator membership" value={context.currentRole ?? 'none'} />
              <DetailRow label="Operator public id" value={context.userPublicId} />
            </DetailList>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                Scenario tenant
              </span>
              <select
                className={inputClass()}
                onChange={(event) => refreshSelection({ memberId: '', tenantId: event.target.value })}
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

            <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low px-4 py-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-on-surface">Selected actor permissions</h2>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    Pick a member from the table below to change the active scenario actor and keep permission denials explicit.
                  </p>
                </div>
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

            <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low px-4 py-4">
              <h2 className="text-sm font-semibold text-on-surface">Tenant snapshot</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Metric label="Invoices" value={metrics.invoices} />
                <Metric label="Expenses" value={metrics.expenses} />
                <Metric label="Customers" value={metrics.customers} />
                <Metric label="Members" value={metrics.members} />
                <Metric label="Audit events" value={metrics.auditEvents} />
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          description="Keep tenant creation and dataset operations separate from record-level probes. Every button stays visible, but each row-specific mutation now lives in its own modal."
          title="Dataset scenarios"
        >
          <ActionGroup title="Tenant setup">
            <ActionButton
              action="create-tenant-scenario"
              label="Create full tenant"
              onRun={runAction}
              processingAction={processingAction}
            />
            <ActionButton
              action="create-tenant-scenario-seeded"
              label="Create seeded tenant"
              onRun={runAction}
              processingAction={processingAction}
            />
          </ActionGroup>

          <ActionGroup title="Business dataset">
            <ActionButton
              action="create-customer-batch"
              label="Create customer batch"
              onRun={runAction}
              processingAction={processingAction}
            />
            <ActionButton
              action="create-expense-test"
              label="Create expense batch"
              onRun={runAction}
              processingAction={processingAction}
            />
            <ActionButton
              action="create-invoice-test"
              label="Create invoice batch"
              onRun={runAction}
              processingAction={processingAction}
            />
            <ActionButton
              action="generate-demo-data"
              label="Generate demo dataset"
              onRun={runAction}
              processingAction={processingAction}
            />
            <ActionButton
              action="reset-local-dataset"
              label="Reset selected tenant"
              onRun={runAction}
              processingAction={processingAction}
              tone="danger"
            />
            <ActionButton
              action="clear-tenant-data"
              label="Clear selected tenant"
              onRun={runAction}
              processingAction={processingAction}
              tone="danger"
            />
          </ActionGroup>
        </SectionCard>

        <DataTable
          emptyMessage="No memberships found for the selected tenant."
          headerContent={
            <div className="flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
              <span>Open a member to switch the scenario actor or test membership rules.</span>
              <span>Owner cannot be demoted or deactivated.</span>
            </div>
          }
          isEmpty={members.length === 0}
          title="Members"
        >
          <ScrollableTable>
            <table className="w-full min-w-[880px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-outline-variant/15 bg-surface-container-low text-xs font-medium text-on-surface-variant">
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">User Id</th>
                  <th className="px-4 py-3 text-right">Probe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {members.map((member) => (
                  <tr
                    className={`cursor-pointer transition-colors hover:bg-surface-container-low/55 ${member.isCurrentActor ? 'bg-surface-container-low/75' : ''}`}
                    key={member.id}
                    onClick={() => setDialogState({ id: member.id, kind: 'member' })}
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-on-surface">{member.name}</span>
                        {member.isCurrentActor ? (
                          <ToneBadge label="Scenario actor" tone="info" />
                        ) : null}
                      </div>
                      <div className="mt-1 text-xs text-on-surface-variant">{member.email}</div>
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">{member.role}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={member.isActive ? 'confirmed' : 'overdue'} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-on-surface-variant">{member.userId}</td>
                    <td className="px-4 py-3 text-right">
                      <button className={rowActionButtonClass()} type="button">
                        Open actions
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollableTable>
        </DataTable>

        <DataTable
          emptyMessage="No invoices exist for the selected tenant."
          headerContent={
            <span className="text-xs text-on-surface-variant">
              Open an invoice to inspect the record and launch compatible or deliberately incompatible actions from the modal.
            </span>
          }
          isEmpty={invoices.length === 0}
          title="Recent invoices"
        >
          <ScrollableTable>
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-outline-variant/15 bg-surface-container-low text-xs font-medium text-on-surface-variant">
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Window</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Probe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {invoices.map((invoice) => (
                  <tr
                    className="cursor-pointer transition-colors hover:bg-surface-container-low/55"
                    key={invoice.id}
                    onClick={() => setDialogState({ id: invoice.id, kind: 'invoice' })}
                  >
                    <td className="px-4 py-3 font-medium text-on-surface">{invoice.invoiceNumber}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{invoice.customerCompanyName}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={invoice.status} />
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">
                      {formatShortDate(invoice.issueDate)} to {formatShortDate(invoice.dueDate)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-on-surface">
                      {formatMoney(invoice.totalInclTaxCents)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className={rowActionButtonClass()} type="button">
                        Open actions
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
              Open an expense to test deletion against the selected status and surface business-rule errors from the modal flow.
            </span>
          }
          isEmpty={expenses.length === 0}
          title="Recent expenses"
        >
          <ScrollableTable>
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-outline-variant/15 bg-surface-container-low text-xs font-medium text-on-surface-variant">
                  <th className="px-4 py-3">Expense</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Probe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {expenses.map((expense) => (
                  <tr
                    className="cursor-pointer transition-colors hover:bg-surface-container-low/55"
                    key={expense.id}
                    onClick={() => setDialogState({ id: expense.id, kind: 'expense' })}
                  >
                    <td className="px-4 py-3 font-medium text-on-surface">{expense.label}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{expense.category}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{formatShortDate(expense.date)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={expense.status} />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-on-surface">
                      {formatMoney(expense.amountCents)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className={rowActionButtonClass()} type="button">
                        Open actions
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollableTable>
        </DataTable>

        <DataTable
          emptyMessage="No customers exist for the selected tenant."
          isEmpty={customers.length === 0}
          title="Recent customers"
        >
          <ScrollableTable>
            <table className="w-full min-w-[820px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-outline-variant/15 bg-surface-container-low text-xs font-medium text-on-surface-variant">
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td className="px-4 py-3 font-medium text-on-surface">{customer.company}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{customer.name}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{customer.email}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{customer.phone}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{formatTimestamp(customer.createdAt)}</td>
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
              className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]"
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
                placeholder="dev_denied_mark_paid"
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
                  Filter
                </button>
                <button
                  className={buttonClass('secondary')}
                  onClick={() =>
                    router.get(
                      '/_dev/inspector',
                      baseSelection(),
                      {
                        preserveScroll: true,
                        replace: true,
                      }
                    )
                  }
                  type="button"
                >
                  Reset
                </button>
              </div>
            </form>
          }
          isEmpty={audit.events.length === 0}
          title="Audit trail"
        >
          <ScrollableTable maxHeightClass="max-h-[28rem]">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-outline-variant/15 bg-surface-container-low text-xs font-medium text-on-surface-variant">
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Tenant</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">Result</th>
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
                    <td className="px-4 py-3 font-medium text-on-surface">{event.action}</td>
                    <td className="px-4 py-3 text-on-surface-variant">
                      {event.entityType}:{event.entityId}
                    </td>
                    <td className="px-4 py-3">
                      <ToneBadge
                        label={event.result}
                        tone={
                          event.result === 'success'
                            ? 'success'
                            : event.result === 'denied'
                              ? 'danger'
                              : 'warning'
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollableTable>
        </DataTable>

        <Modal
          description="Switch the scenario actor here, then trigger membership mutations from this dialog so any authorization or business-rule mismatch stays visible in context."
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
                    : 'Use as scenario actor'}
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
                      ? 'Toggle active'
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
                <DetailRow label="Email" value={activeMember.email} />
                <DetailRow label="Role" value={activeMember.role} />
                <DetailRow label="Status" value={activeMember.isActive ? 'active' : 'inactive'} />
                <DetailRow label="User id" value={activeMember.userId} />
              </DetailList>

              <CompatibilityBlock
                items={[
                  activeMember.id === context.selectedMemberId
                    ? 'This member is the current scenario actor. Deactivation should fail because self-deactivation is blocked.'
                    : 'Use this member as the scenario actor before testing permission-sensitive flows elsewhere in the page.',
                  activeMember.role === 'owner'
                    ? 'Owner compatibility: role changes and deactivation should be rejected by the business layer.'
                    : 'Member compatibility: role toggle and active toggle are valid probes, subject to the selected actor permissions.',
                ]}
                title="Compatibility notes"
              />
            </div>
          ) : null}
        </Modal>

        <Modal
          description="This modal reflects how the selected invoice status maps to the dev tools actions. Run the action here to see whether the business rules accept it or reject it."
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
                  onClick={() => runAction('change-invoice-status', { invoiceId: activeInvoice.id })}
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
                  onClick={() => runAction('delete-invoice', { invoiceId: activeInvoice.id }, 'danger')}
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
                        'Draft compatibility: edit, issue, and delete are the expected happy-path actions.',
                        'If the selected actor lacks invoice issue permission, the modal-triggered action should fail visibly.',
                      ]
                    : activeInvoice.status === 'issued'
                      ? [
                          'Issued compatibility: advancing status should mark the invoice as paid if the selected actor is allowed to do it.',
                          'Editing or deleting as a draft should be rejected because the record is no longer a draft.',
                        ]
                      : [
                          'Paid compatibility: the record is terminal. Draft-only actions should be rejected.',
                          'The permissive advance action has no issued or draft target here, so it may fall back to creating a fresh draft scenario instead of mutating this invoice.',
                        ]
                }
                title="Compatibility notes"
              />
            </div>
          ) : null}
        </Modal>

        <Modal
          description="Use this modal to test draft deletion versus the explicit confirmed-expense probe. The modal tells you which outcome should be business-compatible before you run it."
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
                        'Draft compatibility: deletion is the normal business path if the selected actor can write drafts.',
                        'Any denial from this modal should therefore come from permissions rather than record status.',
                      ]
                    : [
                        'Confirmed compatibility: deletion is expected to fail because the expense is no longer a draft.',
                        'This explicit confirmed-expense probe exists to surface that business-rule rejection without hiding the action from the UI.',
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

function ActionButton({
  action,
  label,
  onRun,
  processingAction,
  tone = 'primary',
}: {
  action: string
  label: string
  onRun: (action: string, extra?: Record<string, string>, tone?: ActionTone) => void
  processingAction: null | string
  tone?: ActionTone
}) {
  return (
    <button
      className={buttonClass(tone, true)}
      disabled={processingAction === action}
      onClick={() => onRun(action, {}, tone)}
      type="button"
    >
      {processingAction === action ? 'Running...' : label}
    </button>
  )
}

function ActionGroup({
  children,
  title,
}: {
  children: ReactNode
  title: string
}) {
  return (
    <div className="space-y-3 border-t border-outline-variant/10 pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-semibold text-on-surface">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function buttonClass(tone: ActionTone = 'primary', fullWidth = false) {
  if (tone === 'secondary') {
    return `inline-flex items-center justify-center rounded-lg border border-outline-variant/20 bg-surface-container-high px-3 py-2 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-highest disabled:cursor-not-allowed disabled:opacity-60 ${fullWidth ? 'w-full' : ''}`.trim()
  }

  if (tone === 'danger') {
    return `inline-flex items-center justify-center rounded-lg bg-error px-3 py-2 text-sm font-medium text-on-error transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 ${fullWidth ? 'w-full' : ''}`.trim()
  }

  return `inline-flex items-center justify-center rounded-lg milled-steel-gradient px-3 py-2 text-sm font-medium text-on-primary transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60 ${fullWidth ? 'w-full' : ''}`.trim()
}

function CompatibilityBlock({ items, title }: { items: string[]; title: string }) {
  return (
    <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low px-4 py-4">
      <h3 className="text-sm font-semibold text-on-surface">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-on-surface-variant">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

function DetailList({ children }: { children: ReactNode }) {
  return <dl className="divide-y divide-outline-variant/10 rounded-xl border border-outline-variant/15 bg-surface-container-low">{children}</dl>
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
        {label}
      </dt>
      <dd className="text-sm font-medium text-on-surface sm:text-right">{value}</dd>
    </div>
  )
}

function formatMoney(amountCents: number) {
  return formatCurrency(amountCents / 100)
}

function formatTimestamp(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function inputClass() {
  return 'w-full rounded-lg border border-outline-variant/20 bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-hidden focus-visible:ring-2 focus-visible:ring-primary/30'
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low px-3 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-on-surface-variant">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-on-surface">{value}</p>
    </div>
  )
}

function PermissionChip({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={
        active
          ? 'inline-flex rounded-md border border-emerald-600/25 bg-emerald-600/10 px-2 py-1 text-[11px] font-medium text-emerald-700'
          : 'inline-flex rounded-md border border-outline-variant/20 bg-surface-container-high px-2 py-1 text-[11px] font-medium text-on-surface-variant'
      }
    >
      {label}
    </span>
  )
}

function rowActionButtonClass() {
  return 'rounded-lg border border-outline-variant/20 bg-surface-container-high px-3 py-1.5 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-container-highest'
}

function ScrollableTable({
  children,
  maxHeightClass = 'max-h-[24rem]',
}: {
  children: ReactNode
  maxHeightClass?: string
}) {
  return <div className={`${maxHeightClass} overflow-auto`}>{children}</div>
}

function SectionCard({
  children,
  description,
  title,
}: {
  children: ReactNode
  description?: string
  title: string
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface-container-lowest shadow-ambient-tight">
      <div className="border-b border-outline-variant/10 px-5 py-4">
        <h2 className="text-base font-semibold text-on-surface">{title}</h2>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant">{description}</p>
        ) : null}
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  )
}

function ToneBadge({
  label,
  tone,
}: {
  label: string
  tone: 'danger' | 'info' | 'success' | 'warning'
}) {
  const className =
    tone === 'danger'
      ? 'border-error/30 bg-error/10 text-error'
      : tone === 'warning'
        ? 'border-amber-500/30 bg-amber-500/12 text-amber-700'
        : tone === 'info'
          ? 'border-sky-500/30 bg-sky-500/10 text-sky-700'
          : 'border-emerald-600/25 bg-emerald-600/10 text-emerald-700'

  return (
    <span
      className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${className}`}
    >
      {label}
    </span>
  )
}
