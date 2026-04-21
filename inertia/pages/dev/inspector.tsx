import { Link } from '@adonisjs/inertia/react'
import { Head, router } from '@inertiajs/react'
import { useState } from 'react'

import { PageHeader } from '~/components/page_header'

import type { InertiaProps } from '../../types'

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
      userEmail: string
      userName: string
      userPublicId: string
    }
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
        membershipChangeRole: boolean
        membershipList: boolean
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

const ACTIONS: Array<{ id: string; label: string; tone?: 'danger' | 'primary' }> = [
  { id: 'create-invoice-test', label: 'Create test invoice' },
  { id: 'change-invoice-status', label: 'Advance invoice status' },
  { id: 'create-expense-test', label: 'Create test expense' },
  { id: 'change-member-role', label: 'Toggle member role' },
  { id: 'attempt-forbidden-access', label: 'Attempt forbidden access', tone: 'danger' },
  { id: 'switch-tenant', label: 'Switch tenant' },
]

const DATASET_ACTIONS: Array<{ id: string; label: string; tone?: 'danger' | 'primary' }> = [
  { id: 'generate-demo-data', label: 'Generate demo data' },
  { id: 'clear-tenant-data', label: 'Clear active tenant', tone: 'danger' },
  { id: 'reset-local-dataset', label: 'Reset local dataset', tone: 'danger' },
]

export default function DevInspectorPage({ inspector }: Props) {
  const [processingAction, setProcessingAction] = useState<null | string>(null)
  const { audit, context, memberships, metrics } = inspector

  function currentQs() {
    return {
      ...(audit.filters.action ? { action: audit.filters.action } : {}),
      ...(audit.filters.actorId ? { actorId: audit.filters.actorId } : {}),
      ...(audit.filters.tenantId ? { tenantId: audit.filters.tenantId } : {}),
    }
  }

  function runAction(action: string) {
    const payload =
      action === 'switch-tenant'
        ? { ...currentQs(), tenantId: nextTenantId(memberships, context.activeTenantId) }
        : currentQs()

    const url =
      action === 'switch-tenant'
        ? '/_dev/inspector/active-tenant'
        : `/_dev/inspector/actions/${action}`

    const body =
      action === 'switch-tenant'
        ? payload
        : {
            ...payload,
            ...(action === 'switch-tenant' ? {} : {}),
          }

    router.post(url, body as never, {
      onFinish: () => setProcessingAction(null),
      onStart: () => setProcessingAction(action),
      preserveScroll: true,
    })
  }

  function submitAuditFilters(formData: FormData) {
    router.get(
      '/_dev/inspector',
      {
        action: String(formData.get('action') ?? ''),
        actorId: String(formData.get('actorId') ?? ''),
        tenantId: String(formData.get('tenantId') ?? context.activeTenantId),
      },
      {
        preserveScroll: true,
        preserveState: true,
        replace: true,
      }
    )
  }

  return (
    <>
      <Head title="Dev Inspector" />

      <div className="space-y-8">
        <PageHeader
          description="Internal operator console to inspect tenant isolation, fire controlled scenarios, and validate the audit trail."
          eyebrow="Development"
          title="Dev Inspector"
        />

        <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <Card title="Session & Context">
            <div className="grid gap-3 md:grid-cols-2">
              <KeyValue label="Operator" value={context.userName} />
              <KeyValue label="Email" value={context.userEmail} />
              <KeyValue label="Active tenant" value={context.activeTenantName} />
              <KeyValue label="Role" value={context.currentRole ?? 'unknown'} />
              <KeyValue label="Environment" value={context.environment} />
              <KeyValue label="Workspace slug" value={context.activeTenantSlug} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className={buttonClass()}
                onClick={() => runAction('switch-tenant')}
                type="button"
              >
                {processingAction === 'switch-tenant' ? 'Switching...' : 'Switch tenant'}
              </button>
              <button
                className={buttonClass()}
                onClick={() =>
                  router.get('/_dev/inspector', currentQs(), {
                    preserveScroll: true,
                    preserveState: true,
                    replace: true,
                  })
                }
                type="button"
              >
                Refresh data
              </button>
              <Link className={buttonClass('secondary')} href="/signin">
                Go to sign-in
              </Link>
            </div>
          </Card>

          <Card title="Data State">
            <div className="grid gap-3 sm:grid-cols-2">
              <Metric label="Invoices" value={metrics.invoices} />
              <Metric label="Expenses" value={metrics.expenses} />
              <Metric label="Customers" value={metrics.customers} />
              <Metric label="Audit events" value={metrics.auditEvents} />
              <Metric label="Members" value={metrics.members} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {DATASET_ACTIONS.map((action) => (
                <button
                  className={buttonClass(action.tone === 'danger' ? 'danger' : 'primary')}
                  disabled={processingAction === action.id}
                  key={action.id}
                  onClick={() => runAction(action.id)}
                  type="button"
                >
                  {processingAction === action.id ? 'Running...' : action.label}
                </button>
              ))}
            </div>
          </Card>
        </section>

        <Card title="Memberships & Access">
          <div className="space-y-3">
            {memberships.map((membership) => (
              <div
                className="rounded-xl border border-outline-variant/15 bg-surface-container-low px-4 py-4"
                key={membership.id}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-on-surface">
                        {membership.organizationName}
                      </p>
                      {membership.isCurrent ? <Badge label="Active" tone="success" /> : null}
                      {!membership.isActive ? <Badge label="Inactive" tone="danger" /> : null}
                    </div>
                    <p className="mt-1 text-xs text-on-surface-variant">
                      {membership.organizationSlug} · role {membership.role}
                    </p>
                    <p className="mt-2 text-xs text-on-surface-variant">
                      {permissionSummary(membership.permissions)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {!membership.isCurrent ? (
                      <button
                        className={buttonClass()}
                        disabled={processingAction === membership.organizationId}
                        onClick={() =>
                          switchTenant(membership.organizationId, currentQs(), setProcessingAction)
                        }
                        type="button"
                      >
                        Activate tenant
                      </button>
                    ) : null}
                    <Link className={buttonClass('secondary')} href="/dashboard">
                      Open workspace
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Audit Trail">
          <form
            className="grid gap-3 border-b border-outline-variant/10 pb-4 md:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault()
              submitAuditFilters(new FormData(event.currentTarget))
            }}
          >
            <label className="space-y-1">
              <span className="text-xs font-medium text-on-surface-variant">Action</span>
              <input
                className={inputClass()}
                defaultValue={audit.filters.action}
                name="action"
                placeholder="issue, confirm, dev_denied_mark_paid"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-on-surface-variant">Actor</span>
              <select className={inputClass()} defaultValue={audit.filters.actorId} name="actorId">
                <option value="">All actors</option>
                {audit.actors.map((actor) => (
                  <option key={actor.id} value={actor.id}>
                    {actor.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-medium text-on-surface-variant">Tenant</span>
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
            </label>
            <div className="flex items-end gap-2">
              <button className={buttonClass()} type="submit">
                Apply filters
              </button>
              <button
                className={buttonClass('secondary')}
                onClick={() =>
                  router.get('/_dev/inspector', {}, { preserveScroll: true, replace: true })
                }
                type="button"
              >
                Reset
              </button>
            </div>
          </form>

          <div className="overflow-x-auto pt-4">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-outline-variant/15 text-[11px] uppercase tracking-wide text-on-surface-variant">
                  <th className="px-2 py-2 font-medium">Timestamp</th>
                  <th className="px-2 py-2 font-medium">Actor</th>
                  <th className="px-2 py-2 font-medium">Tenant</th>
                  <th className="px-2 py-2 font-medium">Action</th>
                  <th className="px-2 py-2 font-medium">Resource</th>
                  <th className="px-2 py-2 font-medium">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {audit.events.length === 0 ? (
                  <tr>
                    <td className="px-2 py-6 text-on-surface-variant" colSpan={6}>
                      No audit events match the current filters.
                    </td>
                  </tr>
                ) : (
                  audit.events.map((event) => (
                    <tr key={event.id}>
                      <td className="whitespace-nowrap px-2 py-3 text-on-surface-variant">
                        {formatTimestamp(event.timestamp)}
                      </td>
                      <td className="px-2 py-3 text-on-surface">
                        {event.actorName || event.actorEmail || event.actorId || 'system'}
                      </td>
                      <td className="px-2 py-3 text-on-surface-variant">
                        {event.organizationName}
                      </td>
                      <td className="px-2 py-3 font-medium text-on-surface">{event.action}</td>
                      <td className="px-2 py-3 text-on-surface-variant">
                        {event.entityType}:{event.entityId}
                      </td>
                      <td className="px-2 py-3">
                        <Badge
                          label={event.result}
                          tone={
                            event.result === 'denied'
                              ? 'danger'
                              : event.result === 'error'
                                ? 'danger'
                                : 'success'
                          }
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Test Actions">
          <div className="flex flex-wrap gap-2">
            {ACTIONS.map((action) => (
              <button
                className={buttonClass(action.tone === 'danger' ? 'danger' : 'primary')}
                disabled={processingAction === action.id}
                key={action.id}
                onClick={() => runAction(action.id)}
                type="button"
              >
                {processingAction === action.id ? 'Running...' : action.label}
              </button>
            ))}
          </div>
        </Card>
      </div>
    </>
  )
}

function Badge({ label, tone }: { label: string; tone: 'danger' | 'success' }) {
  const className =
    tone === 'danger'
      ? 'border-error/30 bg-error/10 text-error'
      : 'border-emerald-600/25 bg-emerald-600/10 text-emerald-700'

  return (
    <span
      className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${className}`}
    >
      {label}
    </span>
  )
}

function buttonClass(tone: 'danger' | 'primary' | 'secondary' = 'primary') {
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

function formatTimestamp(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function inputClass() {
  return 'w-full rounded-lg border border-outline-variant/20 bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-hidden focus-visible:ring-2 focus-visible:ring-primary/30'
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low px-3 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-on-surface-variant">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-on-surface">{value}</p>
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

function nextTenantId(
  memberships: Props['inspector']['memberships'],
  activeTenantId: string
): string {
  if (memberships.length === 0) {
    return activeTenantId
  }

  const currentIndex = memberships.findIndex(
    (membership) => membership.organizationId === activeTenantId
  )
  if (currentIndex === -1) {
    return memberships[0].organizationId
  }

  return memberships[(currentIndex + 1) % memberships.length].organizationId
}

function permissionSummary(
  permissions: Props['inspector']['memberships'][number]['permissions']
): string {
  const labels = [
    permissions.accountingRead ? 'read' : null,
    permissions.accountingWriteDrafts ? 'draft-write' : null,
    permissions.auditTrailView ? 'audit' : null,
    permissions.membershipList ? 'members' : null,
    permissions.membershipChangeRole ? 'role-change' : null,
  ].filter(Boolean)

  return labels.length > 0 ? `Permissions: ${labels.join(', ')}` : 'Permissions: none'
}

function switchTenant(
  tenantId: string,
  query: Record<string, string>,
  setProcessingAction: (value: null | string) => void
) {
  router.post(
    '/_dev/inspector/active-tenant',
    {
      ...query,
      tenantId,
    } as never,
    {
      onFinish: () => setProcessingAction(null),
      onStart: () => setProcessingAction(tenantId),
      preserveScroll: true,
    }
  )
}
