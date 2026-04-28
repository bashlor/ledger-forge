import type { InvoiceAuditEventDto, InvoiceDto } from '~/lib/types'

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
            className="rounded-lg bg-surface-container-highest px-4 py-3 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-high"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
      }
      icon="receipt_long"
      onClose={onClose}
      open={open}
      title={invoice ? `${invoice.invoiceNumber} history` : 'Invoice history'}
    >
      {loading ? (
        <div className="space-y-3">
          <div className="h-20 animate-pulse rounded-2xl bg-surface-container-low" />
          <div className="h-20 animate-pulse rounded-2xl bg-surface-container-low" />
          <div className="h-20 animate-pulse rounded-2xl bg-surface-container-low" />
        </div>
      ) : errorMessage ? (
        <div className="rounded-2xl border border-error/20 bg-error/5 p-4 text-sm text-on-surface">
          <p className="font-semibold text-error">Audit history unavailable</p>
          <p className="mt-2 text-on-surface-variant">{errorMessage}</p>
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-border-default bg-surface-container-low p-5 text-sm text-on-surface-variant">
          No audit events recorded for this invoice yet.
        </div>
      ) : (
        <ol className="space-y-4">
          {events.map((event) => (
            <li
              className="rounded-2xl border border-border-default bg-white p-4 shadow-sm"
              key={event.id}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-on-surface">
                    {labelForAction(event.action)}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                    {summarizeChange(event)}
                  </p>
                </div>
                <div className="text-sm text-on-surface-variant sm:text-right">
                  <p>{historyDateFormatter.format(new Date(event.createdAt))}</p>
                  <p className="mt-1">Actor: {event.actorId ?? 'System'}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
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
