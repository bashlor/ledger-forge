import { useState } from 'react'

import { SecondaryButton } from '~/components/button'
import { DrawerPanel } from '~/components/drawer_panel'
import { Modal } from '~/components/modal'
import { Eyebrow } from '~/components/ui'

import type { ActionTone, DevConsoleTab, Props } from './inspector_types'

import {
  DetailList,
  DetailRow,
  formatTimestamp,
  humanizeAuditAction,
  JsonPreview,
} from './inspector_display_helpers'
import { tabs } from './inspector_types'
import {
  buttonClass,
  copyButtonClass,
  DevConsoleHeader,
  inputClass,
  labelClass,
  RoleBadge,
  RuleList,
  StickyTabs,
  ToneBadge,
  toneForAuditResult,
} from './inspector_ui_primitives'

export function AuditEventDrawer({
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
        <SecondaryButton onClick={onClose} type="button">
          Close
        </SecondaryButton>
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

export function CommandPalette({
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
          <Eyebrow>Navigation</Eyebrow>
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
          <Eyebrow>Actions</Eyebrow>
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

export function CreateTenantModal({
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

        <div className="rounded-xl border border-outline-variant/15 bg-surface-container-low px-3 py-2.5 text-sm text-on-surface-variant">
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

export function DevInspectorHeaderShell({
  activeTab,
  counts,
  onChangeTab,
  onRefresh,
  operatorEmail,
  operatorName,
  readOnlyBadge,
}: {
  activeTab: DevConsoleTab
  counts: Record<DevConsoleTab, null | number>
  onChangeTab: (tab: DevConsoleTab) => void
  onRefresh: () => void
  operatorEmail: string
  operatorName: string
  readOnlyBadge: string
}) {
  return (
    <>
      <DevConsoleHeader
        onRefresh={onRefresh}
        operatorEmail={operatorEmail}
        operatorName={operatorName}
        readOnlyBadge={readOnlyBadge}
      />
      <StickyTabs activeTab={activeTab} counts={counts} onChange={onChangeTab} />
    </>
  )
}

export function MemberDrawer({
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
