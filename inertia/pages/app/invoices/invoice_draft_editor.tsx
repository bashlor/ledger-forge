import type { CustomerSelectDto, InvoiceDto, InvoiceLineInput } from '~/lib/types'

import { AppIcon } from '~/components/app_icon'
import { ErrorBanner } from '~/components/error_banner'
import { InvoiceTotals } from '~/components/invoice_totals'
import { StatusBadge } from '~/components/status_badge'
import { TableHeaderCell, TableHeadRow } from '~/components/ui'
import { formatCurrency } from '~/lib/format'
import { calculateInvoiceLine, canDeleteInvoice, canIssueInvoice } from '~/lib/invoices'

export type EditableInvoiceLine = InvoiceLineInput & { key: string }

const VAT_OPTIONS = [0, 5.5, 10, 20]

interface Props {
  accountingReadOnly: boolean
  accountingReadOnlyMessage: string
  customers: CustomerSelectDto[]
  effectiveCustomerId: string
  form: { customerId: string; dueDate: string; issueDate: string; lines: EditableInvoiceLine[] }
  formIsValid: boolean
  isCreating: boolean
  minDueDate: string
  onDeleteDraft: () => void
  onFormChange: (field: 'customerId' | 'dueDate' | 'issueDate', value: string) => void
  onIssueInvoice: () => void
  onLineAdd: () => void
  onLineRemove: (key: string) => void
  onLineUpdate: (key: string, field: keyof InvoiceLineInput, value: string) => void
  onSaveDraft: () => void
  saving: boolean
  selectedInvoice: InvoiceDto | null
  totals: TotalsValues
}

interface TotalsValues {
  subtotalExclTax: number
  totalInclTax: number
  totalVat: number
}

export function InvoiceDraftEditor({
  accountingReadOnly,
  accountingReadOnlyMessage,
  customers,
  effectiveCustomerId,
  form,
  formIsValid,
  isCreating,
  minDueDate,
  onDeleteDraft,
  onFormChange,
  onIssueInvoice,
  onLineAdd,
  onLineRemove,
  onLineUpdate,
  onSaveDraft,
  saving,
  selectedInvoice,
  totals,
}: Props) {
  return (
    <div>
      <div className="border-b border-outline-variant/10 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            {isCreating ? 'Draft' : 'Editing draft'}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {!isCreating && selectedInvoice ? (
              <StatusBadge status={selectedInvoice.status} />
            ) : (
              <span className="rounded-full bg-surface-container-low px-3 py-1 text-xs font-semibold text-on-surface-variant">
                Draft
              </span>
            )}
            <span className="rounded-full bg-surface-container-low px-3 py-1 text-xs font-semibold text-on-surface-variant">
              Editable
            </span>
          </div>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-on-surface-variant">
          Add or remove lines, check VAT, then save the draft before issuing.
        </p>
      </div>

      {customers.length === 0 ? (
        <div className="px-5 py-6 sm:px-6">
          <div className="rounded-2xl border border-outline-variant/35 bg-surface-container-low p-5 text-sm text-on-surface-variant">
            Create a customer first before you can save an invoice.
          </div>
        </div>
      ) : (
        <div className="space-y-6 px-5 py-6 sm:px-6">
          {accountingReadOnly ? <ErrorBanner message={accountingReadOnlyMessage} /> : null}

          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-1">
              <label
                className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant"
                htmlFor="invoice-client"
              >
                Customer
              </label>
              <select
                className="w-full rounded-xl border border-outline-variant/35 bg-white px-3 py-3 text-sm text-on-surface outline-hidden transition-colors focus:border-primary"
                disabled={accountingReadOnly}
                id="invoice-client"
                onChange={(event) => onFormChange('customerId', event.target.value)}
                value={effectiveCustomerId}
              >
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.company}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant"
                htmlFor="invoice-issue-date"
              >
                Issue date
              </label>
              <input
                className="w-full rounded-xl border border-outline-variant/35 bg-white px-3 py-3 text-sm text-on-surface outline-hidden transition-colors focus:border-primary"
                disabled={accountingReadOnly}
                id="invoice-issue-date"
                onChange={(event) => onFormChange('issueDate', event.target.value)}
                type="date"
                value={form.issueDate}
              />
            </div>
            <div>
              <label
                className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant"
                htmlFor="invoice-due-date"
              >
                Due date
              </label>
              <input
                className="w-full rounded-xl border border-outline-variant/35 bg-white px-3 py-3 text-sm text-on-surface outline-hidden transition-colors focus:border-primary"
                disabled={accountingReadOnly}
                id="invoice-due-date"
                min={minDueDate}
                onChange={(event) => onFormChange('dueDate', event.target.value)}
                type="date"
                value={form.dueDate}
              />
              {form.dueDate && form.dueDate < minDueDate ? (
                <p className="mt-2 text-xs font-medium text-error">
                  Due date must be on or after {minDueDate}.
                </p>
              ) : null}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-outline-variant/35">
            <div className="flex items-center justify-between border-b border-outline-variant/10 bg-surface-container-low px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-on-surface">Invoice lines</h3>
                <p className="text-xs text-on-surface-variant">
                  Description, quantity, unit price, and VAT.
                </p>
              </div>
              <button
                className="inline-flex items-center gap-2 rounded-xl border border-outline-variant/35 bg-white px-3 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-lowest"
                disabled={accountingReadOnly}
                onClick={onLineAdd}
                type="button"
              >
                <AppIcon name="add" size={16} />
                Add line
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[740px]">
                <thead>
                  <TableHeadRow className="text-[11px] tracking-[0.18em]">
                    <TableHeaderCell className="py-3">Description</TableHeaderCell>
                    <TableHeaderCell className="py-3">Qty</TableHeaderCell>
                    <TableHeaderCell className="py-3">Unit price</TableHeaderCell>
                    <TableHeaderCell className="py-3">VAT</TableHeaderCell>
                    <TableHeaderCell className="py-3 text-right">Line total</TableHeaderCell>
                    <TableHeaderCell className="py-3 text-right">Action</TableHeaderCell>
                  </TableHeadRow>
                </thead>
                <tbody className="divide-y divide-outline-variant/15 bg-white">
                  {form.lines.map((line) => {
                    const calculated = calculateInvoiceLine(line, line.key)
                    return (
                      <tr key={line.key}>
                        <td className="px-4 py-3">
                          <input
                            aria-label="Line description"
                            className="w-full rounded-xl border border-outline-variant/35 bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface outline-hidden transition-colors focus:border-primary"
                            disabled={accountingReadOnly}
                            onChange={(event) =>
                              onLineUpdate(line.key, 'description', event.target.value)
                            }
                            placeholder="Monthly bookkeeping"
                            type="text"
                            value={line.description}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            aria-label="Quantity"
                            className="w-24 rounded-xl border border-outline-variant/35 bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface outline-hidden transition-colors focus:border-primary"
                            disabled={accountingReadOnly}
                            min="0"
                            onChange={(event) =>
                              onLineUpdate(line.key, 'quantity', event.target.value)
                            }
                            step="1"
                            type="number"
                            value={line.quantity}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            aria-label="Unit price"
                            className="w-32 rounded-xl border border-outline-variant/35 bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface outline-hidden transition-colors focus:border-primary"
                            disabled={accountingReadOnly}
                            min="0"
                            onChange={(event) =>
                              onLineUpdate(line.key, 'unitPrice', event.target.value)
                            }
                            step="0.01"
                            type="number"
                            value={line.unitPrice}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <select
                            aria-label="VAT rate"
                            className="w-28 rounded-xl border border-outline-variant/35 bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface outline-hidden transition-colors focus:border-primary"
                            disabled={accountingReadOnly}
                            onChange={(event) =>
                              onLineUpdate(line.key, 'vatRate', event.target.value)
                            }
                            value={line.vatRate}
                          >
                            {VAT_OPTIONS.map((rate) => (
                              <option key={rate} value={rate}>
                                {rate}%
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums text-on-surface">
                          {formatCurrency(calculated.lineTotalInclTax)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            className="rounded-xl px-3 py-2 text-sm font-semibold text-error transition-colors hover:bg-error-container/40 disabled:cursor-not-allowed disabled:text-on-surface-variant"
                            disabled={accountingReadOnly || form.lines.length === 1}
                            onClick={() => onLineRemove(line.key)}
                            type="button"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded-2xl border border-outline-variant/35 bg-surface-container-low p-5">
              <h3 className="text-sm font-semibold text-on-surface">Business rules</h3>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-on-surface-variant">
                <li>Every invoice starts as a draft.</li>
                <li>Once issued, an invoice cannot be edited.</li>
                <li>Only drafts can be deleted.</li>
              </ul>
            </div>
            <InvoiceTotals
              subtotalExclTax={totals.subtotalExclTax}
              totalInclTax={totals.totalInclTax}
              totalVat={totals.totalVat}
            />
          </div>

          <div className="flex flex-col gap-3 border-t border-outline-variant/20 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-on-surface-variant">
              {isCreating
                ? 'Save the draft first, then issue the invoice.'
                : 'The invoice stays editable while it remains a draft.'}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {!isCreating && selectedInvoice && canDeleteInvoice(selectedInvoice) ? (
                <button
                  className="rounded-xl border border-error/18 px-4 py-2.5 text-sm font-semibold text-error transition-colors hover:bg-error-container/35 disabled:opacity-60"
                  disabled={accountingReadOnly || saving}
                  onClick={onDeleteDraft}
                  type="button"
                >
                  Delete draft
                </button>
              ) : null}
              <button
                className="rounded-xl border border-outline-variant/35 bg-white px-4 py-2.5 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-lowest disabled:opacity-60"
                disabled={accountingReadOnly || saving || customers.length === 0 || !formIsValid}
                onClick={onSaveDraft}
                type="button"
              >
                {saving ? 'Saving…' : 'Save draft'}
              </button>
              {!isCreating && selectedInvoice && canIssueInvoice(selectedInvoice) ? (
                <button
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-on-primary milled-steel-gradient transition-all hover:opacity-95 disabled:opacity-60"
                  disabled={accountingReadOnly || saving}
                  onClick={onIssueInvoice}
                  type="button"
                >
                  <AppIcon name="send" size={16} />
                  Issue invoice
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
