import { Link } from '@adonisjs/inertia/react'
import { Head, router } from '@inertiajs/react'
import { useState } from 'react'

import { DataTable } from '~/components/data_table'
import { PageHeader } from '~/components/page_header'

import type { InertiaProps } from '../../types'

type ActionTone = 'danger' | 'primary' | 'secondary'

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
  const { audit, context, customers, expenses, invoices, members, memberships, metrics } = inspector

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

  return (
    <>
      <Head title="Dev Inspector" />

      <div className="space-y-8">
        <PageHeader
          description="Operator console for manual tenant-isolation checks, permission testing, and quick data scenario setup."
          eyebrow="Development"
          title="Dev Inspector"
        />

        <section className="rounded-2xl border border-outline-variant/20 bg-[linear-gradient(135deg,rgba(25,52,65,0.96),rgba(19,28,33,0.96))] p-5 text-slate-50 shadow-ambient-tight">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge label={context.readOnlyBadge} tone="warning" />
                <Badge label={`Environment: ${context.environment}`} tone="info" />
              </div>
              <h2 className="text-xl font-semibold">Operator session stays read-only</h2>
              <p className="max-w-3xl text-sm leading-6 text-slate-200/80">
                The dev operator can inspect everything in this console, but scenario actions run
                against the selected tenant/member context so permission denials remain visible and
                testable.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <KeyValue inverse label="Signed in as" value={context.userName} />
              <KeyValue inverse label="Session tenant" value={context.activeTenantName} />
              <KeyValue inverse label="Scenario tenant" value={context.selectedTenantName} />
              <KeyValue
                inverse
                label="Scenario actor"
                value={
                  context.selectedMemberRole
                    ? `${context.selectedMemberName} (${context.selectedMemberRole})`
                    : context.selectedMemberName
                }
              />
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <Card title="Console Context">
            <div className="grid gap-3 md:grid-cols-2">
              <KeyValue label="Operator email" value={context.userEmail} />
              <KeyValue label="Workspace slug" value={context.activeTenantSlug} />
              <KeyValue label="Operator membership" value={context.currentRole ?? 'none'} />
              <KeyValue label="Operator public id" value={context.userPublicId} />
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
                  Scenario tenant
                </span>
                <select
                  className={inputClass()}
                  onChange={(event) => refreshSelection({ memberId: '', tenantId: event.target.value })}
                  value={context.selectedTenantId}
                >
                  {memberships.map((membership) => (
                    <option key={membership.organizationId} value={membership.organizationId}>
                      {membership.organizationName} ({membership.role})
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
                  Scenario member
                </span>
                <select
                  className={inputClass()}
                  onChange={(event) => refreshSelection({ memberId: event.target.value })}
                  value={context.selectedMemberId}
                >
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} ({member.role}
                      {member.isActive ? '' : ', inactive'})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                className={buttonClass()}
                onClick={() => switchTenant(context.selectedTenantId)}
                type="button"
              >
                {processingAction === `switch:${context.selectedTenantId}`
                  ? 'Switching...'
                  : 'Make session tenant active'}
              </button>
              <button
                className={buttonClass('secondary')}
                onClick={() => refreshSelection({})}
                type="button"
              >
                Refresh console
              </button>
              <Link className={buttonClass('secondary')} href="/dashboard">
                Open current workspace
              </Link>
            </div>
          </Card>

          <Card title="Tenant Snapshot">
            <div className="grid gap-3 sm:grid-cols-2">
              <Metric label="Invoices" value={metrics.invoices} />
              <Metric label="Expenses" value={metrics.expenses} />
              <Metric label="Customers" value={metrics.customers} />
              <Metric label="Members" value={metrics.members} />
              <Metric label="Audit events" value={metrics.auditEvents} />
            </div>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <Card title="Quick Scenarios">
            <div className="grid gap-2 md:grid-cols-2">
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
            </div>
          </Card>

          <Card title="Permission Probes">
            <div className="grid gap-2 md:grid-cols-2">
              <ActionButton
                action="toggle-member-active"
                label="Toggle selected member"
                onRun={runAction}
                processingAction={processingAction}
              />
              <ActionButton
                action="change-member-role"
                label="Promote / demote selected member"
                onRun={runAction}
                processingAction={processingAction}
              />
              <ActionButton
                action="update-invoice-draft"
                label="Edit latest draft invoice"
                onRun={runAction}
                processingAction={processingAction}
              />
              <ActionButton
                action="change-invoice-status"
                label="Issue / mark paid invoice"
                onRun={runAction}
                processingAction={processingAction}
              />
              <ActionButton
                action="delete-invoice"
                label="Delete latest draft invoice"
                onRun={runAction}
                processingAction={processingAction}
                tone="secondary"
              />
              <ActionButton
                action="attempt-forbidden-access"
                label="Attempt forbidden invoice action"
                onRun={runAction}
                processingAction={processingAction}
                tone="danger"
              />
            </div>
          </Card>
        </section>

        <DataTable
          emptyMessage="No memberships found for the selected tenant."
          headerContent={
            <span className="text-xs text-on-surface-variant">
              Owner cannot be demoted or deactivated.
            </span>
          }
          isEmpty={members.length === 0}
          title="Members"
        >
          <table className="w-full min-w-[880px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-outline-variant/15 text-[11px] uppercase tracking-wide text-on-surface-variant">
                <th className="px-3 py-2 font-medium">Member</th>
                <th className="px-3 py-2 font-medium">Role</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">User Id</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {members.map((member) => (
                <tr key={member.id}>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-on-surface">{member.name}</span>
                      {member.isCurrentActor ? <Badge label="Scenario actor" tone="info" /> : null}
                    </div>
                    <div className="text-xs text-on-surface-variant">{member.email}</div>
                  </td>
                  <td className="px-3 py-3 text-on-surface-variant">{member.role}</td>
                  <td className="px-3 py-3">
                    <Badge label={member.isActive ? 'active' : 'inactive'} tone={member.isActive ? 'success' : 'danger'} />
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-on-surface-variant">{member.userId}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        className={buttonClass('secondary')}
                        onClick={() => refreshSelection({ memberId: member.id })}
                        type="button"
                      >
                        Select
                      </button>
                      <button
                        className={buttonClass()}
                        onClick={() => runAction('toggle-member-active', { memberId: member.id })}
                        type="button"
                      >
                        Toggle active
                      </button>
                      <button
                        className={buttonClass()}
                        onClick={() => runAction('change-member-role', { memberId: member.id })}
                        type="button"
                      >
                        Toggle role
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTable>

        <section className="grid gap-4 xl:grid-cols-2">
          <DataTable
            emptyMessage="No invoices exist for the selected tenant."
            isEmpty={invoices.length === 0}
            title="Recent Invoices"
          >
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-outline-variant/15 text-[11px] uppercase tracking-wide text-on-surface-variant">
                  <th className="px-3 py-2 font-medium">Invoice</th>
                  <th className="px-3 py-2 font-medium">Customer</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Total</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="px-3 py-3">
                      <div className="font-medium text-on-surface">{invoice.invoiceNumber}</div>
                      <div className="text-xs text-on-surface-variant">
                        {invoice.issueDate} {'->'} {invoice.dueDate}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-on-surface-variant">{invoice.customerCompanyName}</td>
                    <td className="px-3 py-3">
                      <Badge label={invoice.status} tone={invoice.status === 'paid' ? 'success' : 'info'} />
                    </td>
                    <td className="px-3 py-3 text-on-surface">{formatMoney(invoice.totalInclTaxCents)}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className={buttonClass()}
                          onClick={() => runAction('update-invoice-draft', { invoiceId: invoice.id })}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          className={buttonClass()}
                          onClick={() => runAction('change-invoice-status', { invoiceId: invoice.id })}
                          type="button"
                        >
                          Advance status
                        </button>
                        <button
                          className={buttonClass('secondary')}
                          onClick={() => runAction('delete-invoice', { invoiceId: invoice.id })}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTable>

          <DataTable
            emptyMessage="No expenses exist for the selected tenant."
            isEmpty={expenses.length === 0}
            title="Recent Expenses"
          >
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-outline-variant/15 text-[11px] uppercase tracking-wide text-on-surface-variant">
                  <th className="px-3 py-2 font-medium">Expense</th>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Amount</th>
                  <th className="px-3 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td className="px-3 py-3">
                      <div className="font-medium text-on-surface">{expense.label}</div>
                      <div className="text-xs text-on-surface-variant">{expense.category}</div>
                    </td>
                    <td className="px-3 py-3 text-on-surface-variant">{expense.date}</td>
                    <td className="px-3 py-3">
                      <Badge
                        label={expense.status}
                        tone={expense.status === 'confirmed' ? 'success' : 'info'}
                      />
                    </td>
                    <td className="px-3 py-3 text-on-surface">{formatMoney(expense.amountCents)}</td>
                    <td className="px-3 py-3">
                      <button
                        className={buttonClass('secondary')}
                        onClick={() => runAction('delete-expense', { expenseId: expense.id })}
                        type="button"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTable>
        </section>

        <DataTable
          emptyMessage="No customers exist for the selected tenant."
          isEmpty={customers.length === 0}
          title="Recent Customers"
        >
          <table className="w-full min-w-[820px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-outline-variant/15 text-[11px] uppercase tracking-wide text-on-surface-variant">
                <th className="px-3 py-2 font-medium">Company</th>
                <th className="px-3 py-2 font-medium">Contact</th>
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">Phone</th>
                <th className="px-3 py-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td className="px-3 py-3 font-medium text-on-surface">{customer.company}</td>
                  <td className="px-3 py-3 text-on-surface-variant">{customer.name}</td>
                  <td className="px-3 py-3 text-on-surface-variant">{customer.email}</td>
                  <td className="px-3 py-3 text-on-surface-variant">{customer.phone}</td>
                  <td className="px-3 py-3 text-on-surface-variant">{formatTimestamp(customer.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
          title="Audit Trail"
        >
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-outline-variant/15 text-[11px] uppercase tracking-wide text-on-surface-variant">
                <th className="px-3 py-2 font-medium">Timestamp</th>
                <th className="px-3 py-2 font-medium">Actor</th>
                <th className="px-3 py-2 font-medium">Tenant</th>
                <th className="px-3 py-2 font-medium">Action</th>
                <th className="px-3 py-2 font-medium">Entity</th>
                <th className="px-3 py-2 font-medium">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {audit.events.map((event) => (
                <tr key={event.id}>
                  <td className="whitespace-nowrap px-3 py-3 text-on-surface-variant">
                    {formatTimestamp(event.timestamp)}
                  </td>
                  <td className="px-3 py-3 text-on-surface">
                    {event.actorName || event.actorEmail || event.actorId || 'system'}
                  </td>
                  <td className="px-3 py-3 text-on-surface-variant">{event.organizationName}</td>
                  <td className="px-3 py-3 font-medium text-on-surface">{event.action}</td>
                  <td className="px-3 py-3 text-on-surface-variant">
                    {event.entityType}:{event.entityId}
                  </td>
                  <td className="px-3 py-3">
                    <Badge
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
        </DataTable>
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
      className={buttonClass(tone)}
      disabled={processingAction === action}
      onClick={() => onRun(action, {}, tone)}
      type="button"
    >
      {processingAction === action ? 'Running...' : label}
    </button>
  )
}

function Badge({
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

function buttonClass(tone: ActionTone = 'primary') {
  if (tone === 'secondary') {
    return 'inline-flex items-center justify-center rounded-lg border border-outline-variant/20 bg-surface-container-high px-3 py-2 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-highest'
  }

  if (tone === 'danger') {
    return 'inline-flex items-center justify-center rounded-lg bg-error px-3 py-2 text-sm font-medium text-on-error transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60'
  }

  return 'inline-flex items-center justify-center rounded-lg milled-steel-gradient px-3 py-2 text-sm font-medium text-on-primary transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60'
}

function Card({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface-container-lowest shadow-ambient-tight">
      <div className="border-b border-outline-variant/10 px-5 py-4">
        <h2 className="text-base font-semibold text-on-surface">{title}</h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  )
}

function formatMoney(amountCents: number) {
  return new Intl.NumberFormat(undefined, {
    currency: 'EUR',
    style: 'currency',
  }).format(amountCents / 100)
}

function formatTimestamp(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function inputClass() {
  return 'w-full rounded-lg border border-outline-variant/20 bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-hidden focus-visible:ring-2 focus-visible:ring-primary/30'
}

function KeyValue({
  inverse = false,
  label,
  value,
}: {
  inverse?: boolean
  label: string
  value: string
}) {
  return (
    <div
      className={
        inverse
          ? 'rounded-xl border border-white/10 bg-white/5 px-3 py-3'
          : 'rounded-xl border border-outline-variant/15 bg-surface-container-low px-3 py-3'
      }
    >
      <p
        className={
          inverse
            ? 'text-[11px] font-medium uppercase tracking-wide text-slate-200/70'
            : 'text-[11px] font-medium uppercase tracking-wide text-on-surface-variant'
        }
      >
        {label}
      </p>
      <p className={inverse ? 'mt-1 text-sm font-semibold text-white' : 'mt-1 text-sm font-semibold text-on-surface'}>
        {value}
      </p>
    </div>
  )
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
