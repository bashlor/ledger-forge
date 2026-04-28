import type { InvoiceAuditEventDto, InvoiceDto } from '~/lib/types'

import { AppIcon } from '~/components/app_icon'
import { DrawerPanel } from '~/components/drawer_panel'
import { formatCurrency, formatShortDate } from '~/lib/format'

interface InvoiceHistoryDrawerProps {
  errorMessage: null | string
  events: InvoiceAuditEventDto[]
  invoice: InvoiceDto | null
  loading: boolean
  onClose: () => void
  open: boolean
}

const historyDateFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function iconForAuditAction(action: string): string {
  switch (action) {
    case 'create_draft':
      return 'add'
    case 'delete_draft':
      return 'delete'
    case 'issue':
      return 'send'
    case 'mark_paid':
      return 'task_alt'
    case 'update_draft':
      return 'edit'
    default:
      return 'receipt_long'
  }
}

export function InvoiceHistoryDrawer({
  errorMessage,
  events,
  invoice,
  loading,
  onClose,
  open,
}: InvoiceHistoryDrawerProps) {
  return (
    <DrawerPanel
      description={
        invoice
          ? `Traceability for ${invoice.invoiceNumber}. Sensitive actions stay blocked if critical audit persistence fails.`
          : 'Traceability for sensitive invoice operations.'
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
      icon="receipt_long"
      maxWidthClass="max-w-[580px]"
      onClose={onClose}
      open={open}
      panelClassName="border-l border-slate-200/90 bg-gradient-to-b from-white to-slate-50/90"
      title={invoice ? `${invoice.invoiceNumber} history` : 'Invoice history'}
    >
      {loading ? (
        <div className="relative pl-2">
          <div
            aria-hidden
            className="absolute bottom-2 left-[15px] top-2 w-px bg-gradient-to-b from-slate-200 via-slate-200 to-transparent"
          />
          <ul className="space-y-5">
            {[1, 2, 3].map((key) => (
              <li className="flex gap-4" key={key}>
                <div className="relative z-[1] mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
                  <span className="h-4 w-4 animate-pulse rounded bg-slate-200" />
                </div>
                <div className="min-w-0 flex-1 space-y-2 pt-0.5">
                  <div className="h-4 w-[56%] max-w-[14rem] animate-pulse rounded bg-slate-200" />
                  <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
                  <div className="h-3 w-4/5 animate-pulse rounded bg-slate-100" />
                </div>
                <div className="hidden w-36 shrink-0 text-right sm:block">
                  <div className="ml-auto h-3 w-28 animate-pulse rounded bg-slate-100" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : errorMessage ? (
        <div className="rounded-2xl border border-error/20 bg-error/5 p-4 text-sm text-on-surface">
          <p className="font-semibold text-error">Audit history unavailable</p>
          <p className="mt-2 text-on-surface-variant">{errorMessage}</p>
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-border-default bg-slate-50/80 p-8 text-center text-sm text-on-surface-variant">
          No audit events recorded for this invoice yet.
        </div>
      ) : (
        <div className="relative pl-2">
          <div
            aria-hidden
            className="absolute bottom-3 left-[15px] top-3 w-px bg-slate-200/90"
          />
          <ol className="relative space-y-0">
            {events.map((event) => {
              const iconName = iconForAuditAction(event.action)
              return (
                <li className="relative flex gap-4 pb-8 last:pb-0" key={event.id}>
                  <div className="relative z-[1] mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200/95 bg-white shadow-sm ring-2 ring-white">
                    <AppIcon className="text-primary" name={iconName} size={17} />
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm shadow-slate-900/[0.04] ring-1 ring-slate-900/[0.03]">
                      <p className="text-[15px] font-semibold leading-snug text-slate-950">
                        {labelForAction(event.action)}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">
                        {summarizeChange(event)}
                      </p>
                      <p className="mt-3 text-xs font-medium text-slate-500 sm:hidden">
                        <span className="tabular-nums">
                          {historyDateFormatter.format(new Date(event.createdAt))}
                        </span>
                        <span className="mx-2 text-slate-300">·</span>
                        Actor: {event.actorId ?? 'System'}
                      </p>
                    </div>
                  </div>
                  <div className="hidden w-[11.5rem] shrink-0 text-right sm:block">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
                      Event time
                    </p>
                    <p className="mt-1 text-sm font-medium tabular-nums leading-snug text-slate-800">
                      {historyDateFormatter.format(new Date(event.createdAt))}
                    </p>
                    <p className="mt-2 text-xs leading-snug text-slate-500">
                      Actor
                      <span className="mt-0.5 block font-medium text-slate-700">
                        {event.actorId ?? 'System'}
                      </span>
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </DrawerPanel>
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function labelForAction(action: string) {
  switch (action) {
    case 'create_draft':
      return 'Draft created'
    case 'delete_draft':
      return 'Draft deleted'
    case 'issue':
      return 'Invoice issued'
    case 'mark_paid':
      return 'Invoice marked as paid'
    case 'update_draft':
      return 'Draft updated'
    default:
      return action.replaceAll('_', ' ')
  }
}

function sumLineTotals(lines: unknown[]) {
  return lines.reduce<number>((total, line) => {
    if (!isRecord(line)) {
      return total
    }

    const lineTotalInclTax = line.lineTotalInclTax
    if (typeof lineTotalInclTax !== 'number') {
      return total
    }

    return total + lineTotalInclTax
  }, 0)
}

function summarizeChange(event: InvoiceAuditEventDto) {
  const changes = toChangeSet(event.changes)
  if (!changes) {
    return 'No structured change recorded.'
  }

  const parts: string[] = []
  const before = changes.before ?? {}
  const after = changes.after ?? {}

  if (before.status !== after.status && before.status && after.status) {
    parts.push(`Status ${String(before.status)} -> ${String(after.status)}`)
  }

  if (before.customerId !== after.customerId && before.customerId && after.customerId) {
    parts.push('Customer changed')
  }

  if (before.issueDate !== after.issueDate && before.issueDate && after.issueDate) {
    parts.push(
      `Issue ${formatShortDate(String(before.issueDate))} -> ${formatShortDate(String(after.issueDate))}`
    )
  }

  if (before.dueDate !== after.dueDate && before.dueDate && after.dueDate) {
    parts.push(
      `Due ${formatShortDate(String(before.dueDate))} -> ${formatShortDate(String(after.dueDate))}`
    )
  }

  const lineSummary = summarizeLines(before.lines, after.lines)
  if (lineSummary) {
    parts.push(lineSummary)
  }

  return parts[0] ?? 'No key change recorded.'
}

function summarizeLines(beforeValue: unknown, afterValue: unknown) {
  const beforeLines = Array.isArray(beforeValue) ? beforeValue : []
  const afterLines = Array.isArray(afterValue) ? afterValue : []

  if (beforeLines.length === 0 && afterLines.length === 0) {
    return null
  }

  const beforeTotal = sumLineTotals(beforeLines)
  const afterTotal = sumLineTotals(afterLines)

  if (beforeLines.length !== afterLines.length || beforeTotal !== afterTotal) {
    return `${afterLines.length} line item${afterLines.length === 1 ? '' : 's'} · total ${formatCurrency(beforeTotal)} -> ${formatCurrency(afterTotal)}`
  }

  return 'Line items updated'
}

function toChangeSet(value: unknown): null | {
  after?: Record<string, unknown>
  before?: Record<string, unknown>
} {
  if (!isRecord(value)) {
    return null
  }

  return {
    after: isRecord(value.after) ? value.after : undefined,
    before: isRecord(value.before) ? value.before : undefined,
  }
}
