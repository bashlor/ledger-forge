import { Head, router } from '@inertiajs/react'
import { useEffect, useMemo, useState } from 'react'

import type { CreateInvoiceInput, CustomerDto, InvoiceDto, InvoiceLineInput } from '~/lib/types'

import { AppIcon } from '~/components/app_icon'
import { useDateScope } from '~/components/date_scope_provider'
import { DateScopeSummary } from '~/components/date_scope_summary'
import { PageHeader } from '~/components/page_header'
import { StatusBadge } from '~/components/status_badge'
import { isDateWithinScope } from '~/lib/date_scope'
import { formatCurrency, formatShortDate } from '~/lib/format'
import {
  calculateInvoiceLine,
  calculateInvoiceTotals,
  canDeleteInvoice,
  canEditInvoice,
  canIssueInvoice,
  canMarkInvoicePaid,
  createEmptyInvoiceLine,
} from '~/lib/invoices'

import type { InertiaProps } from '../../types'

interface EditableInvoiceLine extends InvoiceLineInput {
  key: string
}

const VAT_OPTIONS = [0, 5.5, 10, 20]

export default function InvoicesPage({
  customers,
  initialCustomerId,
  initialInvoiceId,
  invoices: initialInvoices,
  mode,
}: InertiaProps<{
  customers: CustomerDto[]
  initialCustomerId: null | string
  initialInvoiceId: null | string
  invoices: InvoiceDto[]
  mode: 'new' | 'view'
}>) {
  const { scope } = useDateScope()
  const initialState = createInitialState(
    customers,
    initialInvoices,
    initialCustomerId,
    initialInvoiceId,
    mode
  )

  const [form, setForm] = useState(initialState.form)
  const [invoices, setInvoices] = useState(initialInvoices)
  const [isCreating, setIsCreating] = useState(initialState.isCreating)
  const [saving, setSaving] = useState(false)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<null | string>(
    initialState.selectedInvoiceId
  )

  const selectedInvoice = useMemo(
    () => invoices.find((invoice) => invoice.id === selectedInvoiceId) ?? null,
    [invoices, selectedInvoiceId]
  )
  const editingInvoice = selectedInvoice && canEditInvoice(selectedInvoice)
  useEffect(() => {
    const nextState = createInitialState(
      customers,
      initialInvoices,
      initialCustomerId,
      initialInvoiceId,
      mode
    )

    setInvoices(initialInvoices)
    setForm(nextState.form)
    setIsCreating(nextState.isCreating)
    setSelectedInvoiceId(nextState.selectedInvoiceId)
  }, [customers, initialCustomerId, initialInvoiceId, initialInvoices, mode])

  const effectiveCustomerId = form.customerId || customers[0]?.id || ''
  const scopedInvoices = invoices.filter((invoice) => isDateWithinScope(invoice.issueDate, scope))
  const totals = useMemo(
    () =>
      calculateInvoiceTotals(
        form.lines.map((line) => ({
          description: line.description,
          quantity: Number(line.quantity) || 0,
          unitPrice: Number(line.unitPrice) || 0,
          vatRate: Number(line.vatRate) || 0,
        }))
      ),
    [form.lines]
  )

  const draftCount = scopedInvoices.filter((invoice) => invoice.status === 'draft').length
  const issuedCount = scopedInvoices.filter((invoice) => invoice.status === 'issued').length
  const overdueCount = scopedInvoices.filter(
    (invoice) => invoice.status === 'issued' && new Date(invoice.dueDate) < new Date(todayValue())
  ).length

  function handleCreateDraft() {
    setIsCreating(true)
    setSelectedInvoiceId(null)
    setForm(createInitialForm(customers[0]?.id ?? ''))
    router.get('/invoices', { mode: 'new' }, { preserveScroll: true })
  }

  function handleBackToInvoices() {
    router.get('/invoices', {}, { preserveScroll: true })
  }

  function handleSelectInvoice(invoice: InvoiceDto) {
    router.get('/invoices', { invoice: invoice.id }, { preserveScroll: true })
  }

  function updateLine(key: string, field: keyof InvoiceLineInput, value: string) {
    setForm((current) => ({
      ...current,
      lines: current.lines.map((line) =>
        line.key === key
          ? {
              ...line,
              [field]: field === 'description' ? value : value === '' ? 0 : Number(value),
            }
          : line
      ),
    }))
  }

  function addLine() {
    setForm((current) => ({
      ...current,
      lines: [...current.lines, createEditableLine()],
    }))
  }

  function removeLine(key: string) {
    setForm((current) => ({
      ...current,
      lines:
        current.lines.length === 1
          ? current.lines
          : current.lines.filter((line) => line.key !== key),
    }))
  }

  async function handleSaveDraft() {
    const payload = buildPayload({
      ...form,
      customerId: effectiveCustomerId,
    })
    const method = selectedInvoice && editingInvoice ? router.put : router.post
    const url =
      selectedInvoice && editingInvoice ? `/invoices/${selectedInvoice.id}/draft` : '/invoices'

    method(url, payload as never, {
      onFinish: () => setSaving(false),
      onStart: () => setSaving(true),
      preserveScroll: true,
    })
  }

  async function handleIssueInvoice() {
    if (!selectedInvoice || !canIssueInvoice(selectedInvoice)) return

    router.post(
      `/invoices/${selectedInvoice.id}/issue`,
      {},
      {
        onFinish: () => setSaving(false),
        onStart: () => setSaving(true),
        preserveScroll: true,
      }
    )
  }

  async function handleMarkAsPaid() {
    if (!selectedInvoice || !canMarkInvoicePaid(selectedInvoice)) return

    router.post(
      `/invoices/${selectedInvoice.id}/mark-paid`,
      {},
      {
        onFinish: () => setSaving(false),
        onStart: () => setSaving(true),
        preserveScroll: true,
      }
    )
  }

  async function handleDeleteDraftFromList(invoice: InvoiceDto) {
    if (!canDeleteInvoice(invoice)) return

    router.delete(`/invoices/${invoice.id}`, {
      onFinish: () => setSaving(false),
      onStart: () => setSaving(true),
      preserveScroll: true,
    })
  }

  async function handleDeleteDraft() {
    if (!selectedInvoice || !canDeleteInvoice(selectedInvoice)) return

    router.delete(`/invoices/${selectedInvoice.id}`, {
      onFinish: () => setSaving(false),
      onStart: () => setSaving(true),
      preserveScroll: true,
    })
  }

  const formIsValid =
    effectiveCustomerId &&
    form.issueDate &&
    form.dueDate &&
    form.lines.length > 0 &&
    form.lines.every(
      (line) => line.description.trim() && Number(line.quantity) > 0 && Number(line.unitPrice) >= 0
    )

  const isFocusMode = isCreating || selectedInvoiceId !== null
  const focusPageTitle = isCreating ? 'New invoice' : (selectedInvoice?.invoiceNumber ?? 'Invoice')
  const focusPageDescription =
    isCreating || (selectedInvoice && editingInvoice)
      ? 'Draft → issue when totals are final, then mark paid when payment is received.'
      : selectedInvoice
        ? `${selectedInvoice.customerName} · ${formatCurrency(selectedInvoice.totalInclTax)}`
        : ''

  return (
    <>
      <Head title="Invoices" />

      <div className="space-y-8">
        {isFocusMode ? (
          <header className="flex flex-col gap-2">
            <nav
              aria-label="Invoice navigation"
              className="flex flex-wrap items-center gap-2 text-sm font-semibold text-on-surface"
            >
              <button
                className="text-primary transition-colors hover:text-primary-dim"
                onClick={handleBackToInvoices}
                type="button"
              >
                ← Invoices
              </button>
              <span className="text-on-surface-variant">/</span>
              <h1 className="font-headline text-xl font-extrabold tracking-tight text-on-surface sm:text-2xl">
                {focusPageTitle}
              </h1>
            </nav>
            {focusPageDescription ? (
              <p className="max-w-2xl text-sm leading-6 text-on-surface-variant">
                {focusPageDescription}
              </p>
            ) : null}
          </header>
        ) : (
          <PageHeader
            actions={
              <button
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-on-primary shadow-sm milled-steel-gradient transition-all hover:opacity-95"
                onClick={handleCreateDraft}
                type="button"
              >
                New invoice
              </button>
            }
            description="Invoicing covers the main rules: drafts, issuing, payment, and conditional deletion."
            eyebrow="Invoicing"
            title="Invoices"
          />
        )}

        {!isFocusMode ? <DateScopeSummary /> : null}

        {!isFocusMode ? (
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg bg-surface-container-low px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                Drafts
              </p>
              <p className="mt-1.5 text-2xl font-headline font-extrabold tabular-nums text-on-surface">
                {draftCount}
              </p>
              <p className="mt-0.5 text-xs text-on-surface-variant">Before issue</p>
            </div>
            <div className="rounded-lg bg-surface-container-low px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                Issued
              </p>
              <p className="mt-1.5 text-2xl font-headline font-extrabold tabular-nums text-on-surface">
                {issuedCount}
              </p>
              <p className="mt-0.5 text-xs text-on-surface-variant">Awaiting payment</p>
            </div>
            <div className="rounded-lg bg-surface-container-low px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                Overdue
              </p>
              <p className="mt-1.5 text-2xl font-headline font-extrabold tabular-nums text-error">
                {overdueCount}
              </p>
              <p className="mt-0.5 text-xs text-on-surface-variant">Past due date</p>
            </div>
          </div>
        ) : null}

        {!isFocusMode ? (
          <section className="overflow-hidden rounded-lg border border-outline-variant/20 bg-surface-container-lowest shadow-ambient-tight">
            <div className="flex items-center justify-between border-b border-outline-variant/10 px-3 py-2.5">
              <h2 className="text-sm font-semibold text-on-surface">
                All invoices
                <span className="ml-2 font-normal text-on-surface-variant">
                  · {scopedInvoices.length}
                </span>
              </h2>
              <span className="text-[10px] font-medium uppercase tracking-wide text-on-surface-variant">
                Incl. VAT
              </span>
            </div>

            {scopedInvoices.length === 0 ? (
              <div className="px-3 py-8">
                <div className="rounded-lg border border-dashed border-outline-variant/40 bg-surface-container-low px-4 py-4 text-sm text-on-surface-variant">
                  No invoices fall within the selected period.
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant/15 bg-surface-container-low text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
                      <th className="px-3 py-2 font-medium" scope="col">
                        Invoice
                      </th>
                      <th className="px-3 py-2 font-medium" scope="col">
                        Customer
                      </th>
                      <th className="px-3 py-2 font-medium" scope="col">
                        Status
                      </th>
                      <th className="px-3 py-2 font-medium" scope="col">
                        Due
                      </th>
                      <th className="px-3 py-2 text-right font-medium tabular-nums" scope="col">
                        Amount
                      </th>
                      <th className="w-px px-2 py-2 text-right" scope="col">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {scopedInvoices.map((invoice) => (
                      <tr
                        className="cursor-pointer transition-colors hover:bg-surface-container-low/90"
                        key={invoice.id}
                        onClick={() => handleSelectInvoice(invoice)}
                      >
                        <td className="whitespace-nowrap px-3 py-2 font-medium tabular-nums text-on-surface">
                          {invoice.invoiceNumber}
                        </td>
                        <td className="max-w-[220px] truncate px-3 py-2 text-on-surface">
                          {invoice.customerName}
                        </td>
                        <td className="whitespace-nowrap px-3 py-1.5">
                          <StatusBadge status={invoice.status} />
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums text-on-surface-variant">
                          {formatShortDate(invoice.dueDate)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums text-on-surface">
                          {formatCurrency(invoice.totalInclTax)}
                        </td>
                        <td
                          className="whitespace-nowrap px-2 py-2 text-right"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {canDeleteInvoice(invoice) ? (
                            <button
                              aria-label={`Delete draft ${invoice.invoiceNumber}`}
                              className="rounded border border-error/20 px-2 py-1 text-xs font-semibold text-error transition-colors hover:bg-error-container/25 disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={saving}
                              onClick={() => void handleDeleteDraftFromList(invoice)}
                              type="button"
                            >
                              Delete draft
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : (
          <section className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-ambient-tight">
            {isCreating || editingInvoice ? (
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
                          id="invoice-client"
                          onChange={(event) =>
                            setForm((current) => ({ ...current, customerId: event.target.value }))
                          }
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
                          id="invoice-issue-date"
                          onChange={(event) =>
                            setForm((current) => ({ ...current, issueDate: event.target.value }))
                          }
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
                          id="invoice-due-date"
                          onChange={(event) =>
                            setForm((current) => ({ ...current, dueDate: event.target.value }))
                          }
                          type="date"
                          value={form.dueDate}
                        />
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
                          onClick={addLine}
                          type="button"
                        >
                          <AppIcon name="add" size={16} />
                          Add line
                        </button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="min-w-[740px]">
                          <thead>
                            <tr className="bg-surface-container-low text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                              <th className="px-4 py-3">Description</th>
                              <th className="px-4 py-3">Qty</th>
                              <th className="px-4 py-3">Unit price</th>
                              <th className="px-4 py-3">VAT</th>
                              <th className="px-4 py-3 text-right">Line total</th>
                              <th className="px-4 py-3 text-right">Action</th>
                            </tr>
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
                                      onChange={(event) =>
                                        updateLine(line.key, 'description', event.target.value)
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
                                      min="0"
                                      onChange={(event) =>
                                        updateLine(line.key, 'quantity', event.target.value)
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
                                      min="0"
                                      onChange={(event) =>
                                        updateLine(line.key, 'unitPrice', event.target.value)
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
                                      onChange={(event) =>
                                        updateLine(line.key, 'vatRate', event.target.value)
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
                                      disabled={form.lines.length === 1}
                                      onClick={() => removeLine(line.key)}
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

                      <div className="rounded-2xl border border-primary/12 bg-primary/5 p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                          Totals
                        </p>
                        <dl className="mt-4 space-y-3">
                          <div className="flex items-center justify-between text-sm text-on-surface">
                            <dt>Subtotal (ex. VAT)</dt>
                            <dd className="font-semibold tabular-nums">
                              {formatCurrency(totals.subtotalExclTax)}
                            </dd>
                          </div>
                          <div className="flex items-center justify-between text-sm text-on-surface">
                            <dt>VAT total</dt>
                            <dd className="font-semibold tabular-nums">
                              {formatCurrency(totals.totalVat)}
                            </dd>
                          </div>
                          <div className="flex items-center justify-between border-t border-primary/10 pt-3 text-base font-semibold text-primary">
                            <dt>Total (incl. VAT)</dt>
                            <dd className="tabular-nums">{formatCurrency(totals.totalInclTax)}</dd>
                          </div>
                        </dl>
                      </div>
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
                            disabled={saving}
                            onClick={() => void handleDeleteDraft()}
                            type="button"
                          >
                            Delete draft
                          </button>
                        ) : null}
                        <button
                          className="rounded-xl border border-outline-variant/35 bg-white px-4 py-2.5 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-lowest disabled:opacity-60"
                          disabled={saving || customers.length === 0 || !formIsValid}
                          onClick={() => void handleSaveDraft()}
                          type="button"
                        >
                          {saving ? 'Saving…' : 'Save draft'}
                        </button>
                        {!isCreating && selectedInvoice && canIssueInvoice(selectedInvoice) ? (
                          <button
                            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-on-primary milled-steel-gradient transition-all hover:opacity-95 disabled:opacity-60"
                            disabled={saving}
                            onClick={() => void handleIssueInvoice()}
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
            ) : selectedInvoice ? (
              <div>
                <div className="border-b border-outline-variant/10 px-5 py-4 sm:px-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                      <StatusBadge status={selectedInvoice.status} />
                      <p className="text-sm leading-6 text-on-surface-variant">
                        {selectedInvoice.customerName} · Issued{' '}
                        {formatShortDate(selectedInvoice.issueDate)} · Due{' '}
                        {formatShortDate(selectedInvoice.dueDate)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      {canMarkInvoicePaid(selectedInvoice) ? (
                        <button
                          className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-on-primary milled-steel-gradient transition-all hover:opacity-95 disabled:opacity-60"
                          disabled={saving}
                          onClick={() => void handleMarkAsPaid()}
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

                <div className="space-y-6 px-5 py-6 sm:px-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-outline-variant/35 bg-surface-container-low p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">
                        Customer
                      </p>
                      <p className="mt-2 text-sm font-semibold text-on-surface">
                        {selectedInvoice.customerName}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-outline-variant/35 bg-surface-container-low p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">
                        Issue date
                      </p>
                      <p className="mt-2 text-sm font-semibold text-on-surface">
                        {formatShortDate(selectedInvoice.issueDate)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-outline-variant/35 bg-surface-container-low p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">
                        Due date
                      </p>
                      <p className="mt-2 text-sm font-semibold text-on-surface">
                        {formatShortDate(selectedInvoice.dueDate)}
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
                        {selectedInvoice.lines.map((line) => (
                          <tr key={line.id}>
                            <td className="px-4 py-3 text-sm text-on-surface">
                              {line.description}
                            </td>
                            <td className="px-4 py-3 text-sm text-on-surface-variant tabular-nums">
                              {line.quantity}
                            </td>
                            <td className="px-4 py-3 text-sm text-on-surface-variant tabular-nums">
                              {formatCurrency(line.unitPrice)}
                            </td>
                            <td className="px-4 py-3 text-sm text-on-surface-variant">
                              {line.vatRate}%
                            </td>
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
                        {selectedInvoice.status === 'issued'
                          ? 'Issued: the invoice is locked. When payment is received, mark it as paid.'
                          : 'Paid: the invoice is settled and remains visible in the register.'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-primary/12 bg-primary/5 p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                        Totals
                      </p>
                      <dl className="mt-4 space-y-3">
                        <div className="flex items-center justify-between text-sm text-on-surface">
                          <dt>Subtotal (ex. VAT)</dt>
                          <dd className="font-semibold tabular-nums">
                            {formatCurrency(selectedInvoice.subtotalExclTax)}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between text-sm text-on-surface">
                          <dt>VAT total</dt>
                          <dd className="font-semibold tabular-nums">
                            {formatCurrency(selectedInvoice.totalVat)}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between border-t border-primary/10 pt-3 text-base font-semibold text-primary">
                          <dt>Total (incl. VAT)</dt>
                          <dd className="tabular-nums">
                            {formatCurrency(selectedInvoice.totalInclTax)}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        )}
      </div>
    </>
  )
}

function buildPayload(form: ReturnType<typeof createInitialForm>): CreateInvoiceInput {
  return {
    customerId: form.customerId,
    dueDate: form.dueDate,
    issueDate: form.issueDate,
    lines: form.lines.map((line) => ({
      description: line.description.trim(),
      quantity: Number(line.quantity),
      unitPrice: Number(line.unitPrice),
      vatRate: Number(line.vatRate),
    })),
  }
}

function createEditableLine(line?: InvoiceLineInput): EditableInvoiceLine {
  return {
    key: crypto.randomUUID(),
    ...(line ?? createEmptyInvoiceLine()),
  }
}

function createInitialForm(customerId = '') {
  const issueDate = todayValue()
  return {
    customerId,
    dueDate: plusDays(issueDate, 15),
    issueDate,
    lines: [createEditableLine()],
  }
}

function createInitialState(
  customers: CustomerDto[],
  invoices: InvoiceDto[],
  initialCustomerId: null | string,
  initialInvoiceId: null | string,
  mode: 'new' | 'view'
) {
  if (mode === 'new') {
    return {
      form: createInitialForm(customers[0]?.id ?? ''),
      isCreating: true,
      selectedInvoiceId: null,
    }
  }

  if (initialInvoiceId) {
    const selectedInvoice = invoices.find((invoice) => invoice.id === initialInvoiceId)
    if (selectedInvoice) {
      return {
        form: invoiceToForm(selectedInvoice),
        isCreating: false,
        selectedInvoiceId: selectedInvoice.id,
      }
    }
  }

  const customerIdValid =
    initialCustomerId && customers.some((customer) => customer.id === initialCustomerId)
      ? initialCustomerId
      : null

  if (customerIdValid) {
    const firstForCustomer = invoices.find((invoice) => invoice.customerId === customerIdValid)
    if (firstForCustomer) {
      return {
        form: invoiceToForm(firstForCustomer),
        isCreating: false,
        selectedInvoiceId: firstForCustomer.id,
      }
    }

    return {
      form: createInitialForm(customerIdValid),
      isCreating: true,
      selectedInvoiceId: null,
    }
  }

  return {
    form: createInitialForm(customers[0]?.id ?? ''),
    isCreating: false,
    selectedInvoiceId: null,
  }
}

function invoiceToForm(invoice: InvoiceDto) {
  return {
    customerId: invoice.customerId,
    dueDate: invoice.dueDate,
    issueDate: invoice.issueDate,
    lines: invoice.lines.map((line) => createEditableLine(line)),
  }
}

function plusDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function todayValue() {
  return new Date().toISOString().slice(0, 10)
}
