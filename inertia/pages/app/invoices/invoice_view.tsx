import type { InvoiceDto } from '~/lib/types'

import { AppIcon } from '~/components/app_icon'
import { InvoiceTotals } from '~/components/invoice_totals'
import { StatusBadge } from '~/components/status_badge'
import { formatCurrency, formatShortDate } from '~/lib/format'
import { canMarkInvoicePaid } from '~/lib/invoices'

interface Props {
  invoice: InvoiceDto
  onMarkAsPaid: () => void
  saving: boolean
}

export function InvoiceView({ invoice, onMarkAsPaid, saving }: Props) {
  return (
    <div>
      <div className="border-b border-outline-variant/10 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={invoice.status} />
            <p className="text-sm leading-6 text-on-surface-variant">
              {invoice.customerCompanyName} · Issued {formatShortDate(invoice.issueDate)} · Due{' '}
              {formatShortDate(invoice.dueDate)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {canMarkInvoicePaid(invoice) ? (
              <button
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-on-primary milled-steel-gradient transition-all hover:opacity-95 disabled:opacity-60"
                disabled={saving}
                onClick={onMarkAsPaid}
                type="button"
              >
                <AppIcon name="task_alt" size={16} />
                Mark as paid
              </button>
            ) : null}
            <span className="rounded-full bg-surface-container-low px-3 py-1 text-xs font-semibold text-on-surface-variant">
              Read-only
            </span>
          </div>
        </div>
      </div>

      <div className="border-b border-primary/20 bg-primary/10 px-5 py-3 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Read-only invoice
        </p>
        <p className="mt-1 text-sm text-on-surface-variant">
          This invoice is locked after issue. You can only mark it as paid when applicable.
        </p>
      </div>

      <div className="space-y-6 px-5 py-6 sm:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-outline-variant/35 bg-surface-container-low p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">
              Customer
            </p>
            <p className="mt-2 text-sm font-semibold text-on-surface">
              {invoice.customerCompanySnapshot}
            </p>
            <p className="mt-1 text-xs text-on-surface-variant">
              Company address: {invoice.customerCompanyAddressSnapshot || 'No address'}
            </p>
            <p className="mt-1 text-xs text-on-surface-variant whitespace-pre-line">
              Issued company: {invoice.issuedCompanyName || 'No issued company name'}
              {'\n'}
              Issued address: {invoice.issuedCompanyAddress || 'No issued company address'}
            </p>
            <p className="mt-1 text-xs text-on-surface-variant">
              {invoice.customerPrimaryContactSnapshot || 'No contact name'} · Customer email:{' '}
              {invoice.customerEmailSnapshot || 'No email'} ·{' '}
              {invoice.customerPhoneSnapshot || 'No phone'}
            </p>
          </div>
          <div className="rounded-2xl border border-outline-variant/35 bg-surface-container-low p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">
              Issue date
            </p>
            <p className="mt-2 text-sm font-semibold text-on-surface">
              {formatShortDate(invoice.issueDate)}
            </p>
          </div>
          <div className="rounded-2xl border border-outline-variant/35 bg-surface-container-low p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">
              Due date
            </p>
            <p className="mt-2 text-sm font-semibold text-on-surface">
              {formatShortDate(invoice.dueDate)}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-outline-variant/35">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-container-low text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Unit price</th>
                <th className="px-4 py-3">VAT</th>
                <th className="px-4 py-3 text-right">Line total (incl. VAT)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/15 bg-white">
              {invoice.lines.map((line) => (
                <tr key={line.id}>
                  <td className="px-4 py-3 text-sm text-on-surface">{line.description}</td>
                  <td className="px-4 py-3 text-sm text-on-surface-variant tabular-nums">
                    {line.quantity}
                  </td>
                  <td className="px-4 py-3 text-sm text-on-surface-variant tabular-nums">
                    {formatCurrency(line.unitPrice)}
                  </td>
                  <td className="px-4 py-3 text-sm text-on-surface-variant">{line.vatRate}%</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums text-on-surface">
                    {formatCurrency(line.lineTotalInclTax)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-2xl border border-outline-variant/35 bg-surface-container-low p-5">
            <h3 className="text-sm font-semibold text-on-surface">Lifecycle</h3>
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">
              {invoice.status === 'issued'
                ? 'Issued: the invoice is locked. When payment is received, mark it as paid.'
                : 'Paid: the invoice is settled and remains visible in the register.'}
            </p>
          </div>
          <InvoiceTotals
            subtotalExclTax={invoice.subtotalExclTax}
            totalInclTax={invoice.totalInclTax}
            totalVat={invoice.totalVat}
          />
        </div>
      </div>
    </div>
  )
}
