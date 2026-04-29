import { useMemo } from 'react'

import type {
  CustomerSelectDto,
  InvoiceDto,
  InvoiceLineInput,
  InvoiceLinePreviewDto,
} from '~/lib/types'

import { AppIcon } from '~/components/app_icon'
import { ErrorBanner } from '~/components/error_banner'
import { InvoiceTotals } from '~/components/invoice_totals'
import { StatusBadge } from '~/components/status_badge'
import { Select, TableHeaderCell, TableHeadRow } from '~/components/ui'
import { formatCurrency } from '~/lib/format'
import { canDeleteInvoice, canIssueInvoice, invoiceDisplayStatus } from '~/lib/invoices'

const FIELD_DATE_CLASS =
  'h-10 min-h-10 w-full rounded-xl border border-border-default bg-white px-3 text-sm text-on-surface shadow-sm outline-hidden ring-1 ring-slate-900/[0.05] transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-primary/20'
const LINE_INPUT_CLASS =
  'h-10 min-h-10 w-full rounded-xl border border-border-default bg-surface-container-lowest px-3 text-sm text-on-surface shadow-sm outline-hidden ring-1 ring-slate-900/[0.05] transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-primary/20'
const FIELD_GROUP_CLASS = 'grid min-w-0 grid-rows-[1rem_2.5rem] gap-2'
const FIELD_LABEL_CLASS =
  'block h-4 text-[11px] font-semibold uppercase leading-4 tracking-[0.14em] text-on-surface-variant'
const QTY_COLUMN_CLASS = 'w-14'
const UNIT_PRICE_COLUMN_CLASS = 'w-24'
const VAT_COLUMN_CLASS = 'w-[5.5rem]'
const LINE_TOTAL_COLUMN_CLASS = 'w-36'

export type EditableInvoiceLine = InvoiceLineInput & { key: string }

interface Props {
  accountingReadOnly: boolean
  accountingReadOnlyMessage: string
  customers: CustomerSelectDto[]
  effectiveCustomerId: string
  form: { customerId: string; dueDate: string; issueDate: string; lines: EditableInvoiceLine[] }
  formIsValid: boolean
  isCreating: boolean
  linePreviews: InvoiceLinePreviewDto[]
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
  totalsErrorMessage: null | string
  vatRates: number[]
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
  linePreviews,
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
  totalsErrorMessage,
  vatRates,
}: Props) {
  const customerOptions = useMemo(
    () => customers.map((c) => ({ label: c.company, value: c.id })),
    [customers]
  )
  const vatOptions = useMemo(
    () => vatRates.map((rate) => ({ label: `${rate}%`, value: String(rate) })),
    [vatRates]
  )
  const selectedCustomer = customers.find((customer) => customer.id === effectiveCustomerId)
  const sellerName = selectedInvoice?.issuedCompanyName || 'Captured when issued'
  const sellerAddress = selectedInvoice?.issuedCompanyAddress || 'Seller identity is set at issue.'
  const buyerName =
    selectedCustomer?.company ?? selectedInvoice?.customerCompanyName ?? 'No customer selected'
  const buyerContact =
    selectedCustomer?.name ?? selectedInvoice?.customerPrimaryContactSnapshot ?? 'No contact'
  const buyerDetails = [
    selectedCustomer?.email ?? selectedInvoice?.customerEmailSnapshot,
    selectedCustomer?.phone ?? selectedInvoice?.customerPhoneSnapshot,
  ].filter(Boolean)
  const buyerAddress = selectedInvoice?.customerCompanyAddressSnapshot
  const quantityTotal = form.lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0)
  const unitPriceTotal = form.lines.reduce((sum, line) => sum + Number(line.unitPrice || 0), 0)

  return (
    <div>
      <div className="border-b border-border-hairline px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            {isCreating ? 'Draft' : 'Editing draft'}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {!isCreating && selectedInvoice ? (
              <StatusBadge status={invoiceDisplayStatus(selectedInvoice)} />
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
          <div className="rounded-2xl border border-border-default bg-surface-container-low p-5 text-sm text-on-surface-variant shadow-sm ring-1 ring-slate-900/[0.04]">
            Create a customer first before you can save an invoice.
          </div>
        </div>
      ) : (
        <div className="space-y-6 px-5 py-6 sm:px-6">
          {accountingReadOnly ? <ErrorBanner message={accountingReadOnlyMessage} /> : null}

          <div className="grid items-start gap-4 md:grid-cols-[minmax(18rem,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <div className={FIELD_GROUP_CLASS}>
              <label className={FIELD_LABEL_CLASS} htmlFor="invoice-client">
                Customer
              </label>
              <Select
                align="start"
                aria-label="Invoice customer"
                disabled={accountingReadOnly}
                id="invoice-client"
                onValueChange={(next) => onFormChange('customerId', next)}
                options={customerOptions}
                tone="surface"
                triggerClassName="h-10 min-h-10 py-0 text-sm font-medium leading-snug"
                value={effectiveCustomerId}
              />
            </div>
            <div className={FIELD_GROUP_CLASS}>
              <label className={FIELD_LABEL_CLASS} htmlFor="invoice-issue-date">
                Issue date
              </label>
              <input
                className={FIELD_DATE_CLASS}
                disabled={accountingReadOnly}
                id="invoice-issue-date"
                onChange={(event) => onFormChange('issueDate', event.target.value)}
                type="date"
                value={form.issueDate}
              />
            </div>
            <div className="grid min-w-0 gap-2">
              <div className={FIELD_GROUP_CLASS}>
                <label className={FIELD_LABEL_CLASS} htmlFor="invoice-due-date">
                  Due date
                </label>
                <input
                  className={FIELD_DATE_CLASS}
                  disabled={accountingReadOnly}
                  id="invoice-due-date"
                  min={minDueDate}
                  onChange={(event) => onFormChange('dueDate', event.target.value)}
                  type="date"
                  value={form.dueDate}
                />
              </div>
              {form.dueDate && form.dueDate < minDueDate ? (
                <p className="text-xs font-medium text-error">
                  Due date must be on or after {minDueDate}.
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <InvoicePartyBlock
              eyebrow="Issuer / Seller"
              name={sellerName}
              primaryDetail={sellerAddress}
              tone="seller"
            />
            <InvoicePartyBlock
              eyebrow="Buyer / Customer"
              name={buyerName}
              primaryDetail={buyerContact}
              secondaryDetail={buyerDetails.join(' / ')}
              tertiaryDetail={buyerAddress}
              tone="buyer"
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-border-default shadow-sm ring-1 ring-slate-900/[0.04]">
            <div className="flex items-center justify-between border-b border-border-hairline bg-surface-container-low px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-on-surface">Invoice lines</h3>
                <p className="text-xs text-on-surface-variant">
                  Description, quantity, unit price, and VAT.
                </p>
              </div>
              <button
                className="inline-flex items-center gap-2 rounded-xl border border-border-default bg-white px-3.5 py-2 text-sm font-semibold text-on-surface shadow-sm transition-colors duration-150 hover:border-slate-300 hover:bg-surface-container-lowest"
                disabled={accountingReadOnly}
                onClick={onLineAdd}
                type="button"
              >
                <AppIcon name="add" size={16} />
                Add line
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="table-fixed">
                <colgroup>
                  <col className="w-[28rem]" />
                  <col className="w-[5.5rem]" />
                  <col className="w-[7.5rem]" />
                  <col className="w-[7rem]" />
                  <col className="w-[10rem]" />
                  <col className="w-12" />
                </colgroup>
                <thead>
                  <TableHeadRow className="text-[11px] tracking-[0.18em]">
                    <TableHeaderCell className="py-3">Description</TableHeaderCell>
                    <TableHeaderCell className="py-3 tabular-nums text-center">
                      <span className={`mx-auto block ${QTY_COLUMN_CLASS} text-center`}>Qty</span>
                    </TableHeaderCell>
                    <TableHeaderCell className="py-3 text-center tabular-nums">
                      <span className={`mx-auto block ${UNIT_PRICE_COLUMN_CLASS} text-center`}>
                        Unit price
                      </span>
                    </TableHeaderCell>
                    <TableHeaderCell className="py-3 text-center">
                      <span className={`mx-auto block ${VAT_COLUMN_CLASS} text-center`}>VAT</span>
                    </TableHeaderCell>
                    <TableHeaderCell className="py-3 text-center tabular-nums">
                      <span className={`mx-auto block ${LINE_TOTAL_COLUMN_CLASS} text-center`}>
                        Line total (with VAT)
                      </span>
                    </TableHeaderCell>
                    <TableHeaderCell className="w-px py-3 text-right">
                      <span className="sr-only">Remove line</span>
                    </TableHeaderCell>
                  </TableHeadRow>
                </thead>
                <tbody className="divide-y divide-border-hairline bg-white">
                  {form.lines.map((line, index) => {
                    const calculated = linePreviews[index]
                    return (
                      <tr key={line.key}>
                        <td className="px-4 py-3">
                          <input
                            aria-label="Line description"
                            className={LINE_INPUT_CLASS}
                            disabled={accountingReadOnly}
                            onChange={(event) =>
                              onLineUpdate(line.key, 'description', event.target.value)
                            }
                            placeholder="Monthly bookkeeping"
                            type="text"
                            value={line.description}
                          />
                        </td>
                        <td className="px-4 py-3 text-center align-middle">
                          <input
                            aria-label="Quantity"
                            className={`${LINE_INPUT_CLASS} mx-auto block ${QTY_COLUMN_CLASS} text-center`}
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
                        <td className="px-4 py-3 text-center align-middle">
                          <input
                            aria-label="Unit price"
                            className={`${LINE_INPUT_CLASS} mx-auto block ${UNIT_PRICE_COLUMN_CLASS} text-center`}
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
                        <td className="px-4 py-3 text-center align-middle">
                          <div className="flex justify-center">
                            <Select
                              align="center"
                              aria-label="VAT rate"
                              disabled={accountingReadOnly}
                              onValueChange={(next) => onLineUpdate(line.key, 'vatRate', next)}
                              options={vatOptions}
                              size="compact"
                              tone="surface"
                              triggerClassName={`h-10 min-h-10 ${VAT_COLUMN_CLASS} shrink-0 tabular-nums`}
                              value={String(line.vatRate)}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right align-middle text-sm font-semibold tabular-nums text-on-surface">
                          <span className={`mx-auto block ${LINE_TOTAL_COLUMN_CLASS} text-center`}>
                            {calculated ? formatCurrency(calculated.lineTotalInclTax) : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right align-middle">
                          <button
                            aria-label="Remove line"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 outline-hidden transition-colors duration-150 hover:bg-rose-50 hover:text-rose-600 focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-40"
                            disabled={accountingReadOnly || form.lines.length === 1}
                            onClick={() => onLineRemove(line.key)}
                            type="button"
                          >
                            <AppIcon name="delete" size={18} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="border-t border-border-default bg-slate-50">
                  <tr>
                    <td className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                      Totals
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold tabular-nums text-on-surface">
                      <span className={`mx-auto block ${QTY_COLUMN_CLASS} text-center`}>
                        {quantityTotal}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold tabular-nums text-on-surface">
                      <span className={`mx-auto block ${UNIT_PRICE_COLUMN_CLASS} text-center`}>
                        {formatCurrency(unitPriceTotal)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                      <span className={`mx-auto block ${VAT_COLUMN_CLASS} text-center`}>—</span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold tabular-nums text-on-surface">
                      <span className={`mx-auto block ${LINE_TOTAL_COLUMN_CLASS} text-center`}>
                        {formatCurrency(totals.totalInclTax)}
                      </span>
                    </td>
                    <td className="px-4 py-3" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded-2xl border border-slate-200/90 border-l-[3px] border-l-primary/50 bg-slate-50/90 p-5 shadow-sm ring-1 ring-slate-900/[0.04]">
              <h3 className="text-sm font-semibold text-on-surface">Business rules</h3>
              <ol className="mt-3 list-decimal space-y-2 pl-4 text-sm leading-relaxed text-on-surface-variant marker:font-semibold marker:text-primary">
                <li>Every invoice starts as a draft.</li>
                <li>Once issued, an invoice cannot be edited.</li>
                <li>Only drafts can be deleted.</li>
              </ol>
            </div>
            <InvoiceTotals
              subtotalExclTax={totals.subtotalExclTax}
              totalInclTax={totals.totalInclTax}
              totalVat={totals.totalVat}
            />
            {totalsErrorMessage ? (
              <p className="text-sm font-medium text-error lg:col-span-2">{totalsErrorMessage}</p>
            ) : null}
          </div>

          <div className="border-t border-border-hairline pt-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="flex flex-1 flex-wrap items-center justify-start gap-3">
                {!isCreating && selectedInvoice && canDeleteInvoice(selectedInvoice) ? (
                  <button
                    className="rounded-xl border border-error/25 bg-white px-4 py-2.5 text-sm font-semibold text-error shadow-sm transition-colors duration-150 hover:bg-error-container/30 disabled:opacity-60"
                    disabled={accountingReadOnly || saving}
                    onClick={onDeleteDraft}
                    type="button"
                  >
                    Delete draft
                  </button>
                ) : null}
              </div>
              <p className="flex-[1.4] text-center text-sm leading-6 text-on-surface-variant lg:min-w-0 lg:px-4">
                {isCreating
                  ? 'Save the draft first, then issue the invoice.'
                  : 'The invoice stays editable while it remains a draft.'}
              </p>
              <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
                <button
                  className="rounded-xl border border-border-default bg-white px-4 py-2.5 text-sm font-semibold text-on-surface shadow-sm transition-colors duration-150 hover:bg-surface-container-lowest disabled:opacity-60"
                  disabled={accountingReadOnly || saving || customers.length === 0 || !formIsValid}
                  onClick={onSaveDraft}
                  type="button"
                >
                  {saving ? 'Saving…' : 'Save draft'}
                </button>
                {!isCreating && selectedInvoice && canIssueInvoice(selectedInvoice) ? (
                  <button
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary shadow-sm shadow-primary/25 transition-colors duration-150 hover:bg-primary-dim disabled:opacity-60"
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
        </div>
      )}
    </div>
  )
}

function InvoicePartyBlock({
  eyebrow,
  name,
  primaryDetail,
  secondaryDetail,
  tertiaryDetail,
  tone,
}: {
  eyebrow: string
  name: string
  primaryDetail: string
  secondaryDetail?: string
  tertiaryDetail?: string
  tone: 'buyer' | 'seller'
}) {
  const accent =
    tone === 'seller'
      ? 'border-l-primary/55 bg-primary-container/35'
      : 'border-l-slate-300 bg-slate-50/90'

  return (
    <section
      className={`min-w-0 rounded-2xl border border-slate-200/90 border-l-[3px] ${accent} px-4 py-3.5 shadow-sm ring-1 ring-slate-900/[0.03]`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
        {eyebrow}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-on-surface">{name}</p>
      <p className="mt-1 text-xs leading-5 text-on-surface-variant">{primaryDetail}</p>
      {secondaryDetail ? (
        <p className="mt-0.5 truncate text-xs leading-5 text-on-surface-variant">
          {secondaryDetail}
        </p>
      ) : null}
      {tertiaryDetail ? (
        <p className="mt-0.5 truncate text-xs leading-5 text-on-surface-variant">
          {tertiaryDetail}
        </p>
      ) : null}
    </section>
  )
}
