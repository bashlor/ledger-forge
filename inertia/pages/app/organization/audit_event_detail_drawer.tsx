import { DrawerPanel } from '~/components/drawer_panel'

import type { OrganizationAuditEvent } from './audit_types'

function formatPayload(event: OrganizationAuditEvent): string {
  const payload: Record<string, unknown> = {
    action: event.action,
    actorEmail: event.actorEmail,
    actorId: event.actorId,
    actorName: event.actorName,
    entityId: event.entityId,
    entityType: event.entityType,
    id: event.id,
  }
  if (event.changes !== undefined && event.changes !== null) {
    payload.changes = event.changes as unknown
  }
  if (event.metadata !== undefined && event.metadata !== null) {
    payload.metadata = event.metadata as unknown
  }

  try {
    return JSON.stringify(payload, null, 2)
  } catch {
    return String(payload)
  }
}

interface AuditEventDetailDrawerProps {
  event: null | OrganizationAuditEvent
  onClose: () => void
}

export function AuditEventDetailDrawer({ event, onClose }: AuditEventDetailDrawerProps) {
  const open = event !== null

  return (
    <DrawerPanel
      description={
        event
          ? `${event.action} · ${event.entityType}`
          : 'Structured audit payload for support and compliance review.'
      }
      footer={
        <div className="flex justify-end">
          <button
            className="rounded-xl bg-surface-container-highest px-4 py-3 text-sm font-medium text-on-surface transition-colors duration-150 hover:bg-surface-container-high"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
      }
      icon="monitoring"
      maxWidthClass="max-w-lg"
      onClose={onClose}
      open={open}
      panelClassName="border-l border-slate-200/90 bg-gradient-to-b from-white to-slate-50/90"
      title={event ? 'Event details' : 'Details'}
    >
      {event ? (
        <pre className="max-h-[min(70dvh,28rem)] overflow-auto rounded-xl border border-slate-200/90 bg-slate-950/[0.03] p-4 text-[11px] leading-relaxed text-slate-800 [scrollbar-width:thin]">
          {formatPayload(event)}
        </pre>
      ) : (
        <p className="text-sm text-slate-500">No event selected.</p>
      )}
    </DrawerPanel>
  )
}
