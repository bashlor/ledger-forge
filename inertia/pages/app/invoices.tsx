import { Head, router } from '@inertiajs/react'
import { useEffect, useMemo, useRef, useState } from 'react'

import type {
  CreateInvoiceInput,
  CustomerSelectDto,
  DateScope,
  InvoiceDto,
  InvoiceLineInput,
  InvoiceSummaryDto,
  PaginatedList,
  PaginationMetaDto,
} from '~/lib/types'

import { useDateScope } from '~/components/date_scope_provider'
import { DateScopeSummary } from '~/components/date_scope_summary'
import { PageHeader } from '~/components/page_header'
import { formatCurrency } from '~/lib/format'
import {
  calculateInvoiceTotals,
  canEditInvoice,
  canIssueInvoice,
  createEmptyInvoiceLine,
} from '~/lib/invoices'

import type { InertiaProps } from '../../types'
import type { EditableInvoiceLine } from './invoices/invoice_draft_editor'

import { InvoiceDraftEditor } from './invoices/invoice_draft_editor'
import { InvoiceList } from './invoices/invoice_list'
import { InvoiceView } from './invoices/invoice_view'
import { IssueInvoiceDialog } from './invoices/issue_invoice_dialog'

interface InvoicesPageProps {
  customers: CustomerSelectDto[]
  initialCustomerId: null | string
  initialInvoiceId: null | string
  invoices: PaginatedList<InvoiceDto>
  invoiceSummary?: InvoiceSummaryDto
  mode: 'new' | 'view'
}

export default function InvoicesPage(props: InertiaProps<InvoicesPageProps>) {
  const resetKey = `${props.mode}|${props.initialInvoiceId}|${props.initialCustomerId}|${props.invoices.items.map((i) => i.id).join(':')}|${props.invoices.pagination.page}`
  return <InvoicesContent key={resetKey} {...props} />
}

// --- Helpers ---

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

function createInitialIssueForm(invoice?: InvoiceDto) {
  return {
    issuedCompanyAddress: invoice?.customerCompanyAddressSnapshot ?? '',
    issuedCompanyName: invoice?.customerCompanyName ?? '',
  }
}

function createInitialState(
  customers: CustomerSelectDto[],
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

function InvoicesContent({
  customers,
  initialCustomerId,
  initialInvoiceId,
  invoices,
  invoiceSummary,
  mode,
}: InertiaProps<InvoicesPageProps>) {
  const { scope } = useDateScope()
  const cachedInvoiceSummary = useRef<InvoiceSummaryDto | null>(null)
  if (invoiceSummary) {
    cachedInvoiceSummary.current = invoiceSummary
  }

  useEffect(() => {
    const url = new URL(window.location.href)
    if (
      url.searchParams.get('startDate') === scope.startDate &&
      url.searchParams.get('endDate') === scope.endDate
    ) {
      return
    }
    router.get(
      '/invoices',
      { endDate: scope.endDate, startDate: scope.startDate },
      { preserveScroll: true, preserveState: true, replace: true }
    )
  }, [scope.endDate, scope.startDate])

  const initialState = createInitialState(
    customers,
    invoices.items,
    initialCustomerId,
    initialInvoiceId,
    mode
  )

  const [form, setForm] = useState(initialState.form)
  const [isCreating, setIsCreating] = useState(initialState.isCreating)
  const [saving, setSaving] = useState(false)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<null | string>(
    initialState.selectedInvoiceId
  )
  const [isIssueDialogOpen, setIsIssueDialogOpen] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<null | string>(null)
  const [issueForm, setIssueForm] = useState(createInitialIssueForm())

  const selectedInvoice = useMemo(
    () => invoices.items.find((invoice) => invoice.id === selectedInvoiceId) ?? null,
    [invoices.items, selectedInvoiceId]
  )
  const editingInvoice = selectedInvoice && canEditInvoice(selectedInvoice)
  const effectiveCustomerId = form.customerId || customers[0]?.id || ''
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
  const summary = cachedInvoiceSummary.current

  // --- Navigation ---

  function handleCreateDraft() {
    setIsCreating(true)
    setSelectedInvoiceId(null)
    setForm(createInitialForm(customers[0]?.id ?? ''))
    router.get(
      '/invoices',
      { endDate: scope.endDate, mode: 'new', startDate: scope.startDate },
      { preserveScroll: true }
    )
  }

  function handleBackToInvoices() {
    router.get(
      '/invoices',
      { endDate: scope.endDate, startDate: scope.startDate },
      { preserveScroll: true }
    )
  }

  function handleSelectInvoice(invoice: InvoiceDto) {
    router.get(
      '/invoices',
      {
        endDate: scope.endDate,
        invoice: invoice.id,
        ...(invoices.pagination.page > 1 ? { page: invoices.pagination.page } : {}),
        startDate: scope.startDate,
      },
      { preserveScroll: true }
    )
  }

  function handlePageChange(page: number) {
    router.get(
      '/invoices',
      { endDate: scope.endDate, page, startDate: scope.startDate },
      { only: ['invoices', 'invoiceSummary'], preserveScroll: true, preserveState: true }
    )
  }

  // --- Form ---

  function handleFormChange(field: 'customerId' | 'dueDate' | 'issueDate', value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function handleLineUpdate(key: string, field: keyof InvoiceLineInput, value: string) {
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

  function handleLineAdd() {
    setForm((current) => ({
      ...current,
      lines: [...current.lines, createEditableLine()],
    }))
  }

  function handleLineRemove(key: string) {
    setForm((current) => ({
      ...current,
      lines:
        current.lines.length === 1
          ? current.lines
          : current.lines.filter((line) => line.key !== key),
    }))
  }

  // --- Mutations ---

  function handleSaveDraft() {
    const payload = buildPayload({ ...form, customerId: effectiveCustomerId })
    const path =
      selectedInvoice && editingInvoice ? `/invoices/${selectedInvoice.id}/draft` : '/invoices'
    const url = invoicesUrl(path, scope, invoices.pagination)

    if (selectedInvoice && editingInvoice) {
      router.put(url, payload as never, {
        onFinish: () => setSaving(false),
        onStart: () => setSaving(true),
        preserveScroll: true,
      })
      return
    }

    router.post(url, payload as never, {
      onFinish: () => setSaving(false),
      onStart: () => setSaving(true),
      preserveScroll: true,
    })
  }

  function handleIssueInvoice() {
    if (!selectedInvoice) return
    setIssueForm(createInitialIssueForm(selectedInvoice))
    setIsIssueDialogOpen(true)
  }

  function handleIssueFormFieldChange(
    field: 'issuedCompanyAddress' | 'issuedCompanyName',
    value: string
  ) {
    setIssueForm((current) => ({ ...current, [field]: value }))
  }

  function handleConfirmIssueInvoice() {
    if (!selectedInvoice) return
    router.post(
      invoicesUrl(`/invoices/${selectedInvoice.id}/issue`, scope, invoices.pagination),
      {
        issuedCompanyAddress: issueForm.issuedCompanyAddress,
        issuedCompanyName: issueForm.issuedCompanyName,
      },
      {
        onFinish: () => setSaving(false),
        onStart: () => setSaving(true),
        onSuccess: () => setIsIssueDialogOpen(false),
        preserveScroll: true,
      }
    )
  }

  function handleMarkAsPaid() {
    if (!selectedInvoice) return
    router.post(
      invoicesUrl(`/invoices/${selectedInvoice.id}/mark-paid`, scope, invoices.pagination),
      {},
      {
        onFinish: () => setSaving(false),
        onStart: () => setSaving(true),
        preserveScroll: true,
      }
    )
  }

  function handleDeleteDraftFromList(invoice: InvoiceDto) {
    if (deleteConfirmId !== invoice.id) {
      setDeleteConfirmId(invoice.id)
      return
    }
    setDeleteConfirmId(null)
    router.delete(invoicesUrl(`/invoices/${invoice.id}`, scope, invoices.pagination), {
      onFinish: () => setSaving(false),
      onStart: () => setSaving(true),
      preserveScroll: true,
    })
  }

  function handleDeleteDraft() {
    if (!selectedInvoice) return
    router.delete(invoicesUrl(`/invoices/${selectedInvoice.id}`, scope, invoices.pagination), {
      onFinish: () => setSaving(false),
      onStart: () => setSaving(true),
      preserveScroll: true,
    })
  }

  // --- Derived ---

  const minDueDate = editingInvoice ? selectedInvoice.createdAt : todayValue()
  const hasStructurallyValidLines = form.lines.every(
    (line) => line.description.trim() && Number(line.quantity) > 0 && Number(line.unitPrice) >= 0
  )
  const formIsValid = Boolean(
    effectiveCustomerId &&
    form.issueDate &&
    form.dueDate &&
    form.dueDate >= minDueDate &&
    form.lines.length > 0 &&
    hasStructurallyValidLines
  )

  const isFocusMode = isCreating || selectedInvoiceId !== null
  const focusPageTitle = isCreating ? 'New invoice' : (selectedInvoice?.invoiceNumber ?? 'Invoice')
  const focusPageDescription =
    isCreating || (selectedInvoice && editingInvoice)
      ? 'Draft → issue when totals are final, then mark paid when payment is received.'
      : selectedInvoice
        ? `${selectedInvoice.customerCompanyName} · ${formatCurrency(selectedInvoice.totalInclTax)}`
        : ''

  // --- Render ---

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
          <InvoiceList
            deleteConfirmId={deleteConfirmId}
            invoices={invoices}
            onCancelDelete={() => setDeleteConfirmId(null)}
            onDeleteDraft={handleDeleteDraftFromList}
            onPageChange={handlePageChange}
            onSelectInvoice={handleSelectInvoice}
            saving={saving}
            summary={summary}
          />
        ) : (
          <section className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-ambient-tight">
            {isCreating || editingInvoice ? (
              <InvoiceDraftEditor
                customers={customers}
                effectiveCustomerId={effectiveCustomerId}
                form={form}
                formIsValid={Boolean(formIsValid)}
                isCreating={isCreating}
                minDueDate={minDueDate}
                onDeleteDraft={handleDeleteDraft}
                onFormChange={handleFormChange}
                onIssueInvoice={handleIssueInvoice}
                onLineAdd={handleLineAdd}
                onLineRemove={handleLineRemove}
                onLineUpdate={handleLineUpdate}
                onSaveDraft={handleSaveDraft}
                saving={saving}
                selectedInvoice={selectedInvoice}
                totals={totals}
              />
            ) : selectedInvoice ? (
              <InvoiceView
                invoice={selectedInvoice}
                onMarkAsPaid={handleMarkAsPaid}
                saving={saving}
              />
            ) : null}
          </section>
        )}
      </div>

      <IssueInvoiceDialog
        isOpen={Boolean(isIssueDialogOpen && selectedInvoice && canIssueInvoice(selectedInvoice))}
        issueForm={issueForm}
        onCancel={() => setIsIssueDialogOpen(false)}
        onConfirm={handleConfirmIssueInvoice}
        onFieldChange={handleIssueFormFieldChange}
        saving={saving}
      />
    </>
  )
}

function invoicesUrl(path: string, scope: DateScope, pagination: PaginationMetaDto) {
  const params = new URLSearchParams({
    endDate: scope.endDate,
    startDate: scope.startDate,
  })
  if (pagination.page > 1) {
    params.set('page', String(pagination.page))
  }
  const s = params.toString()
  return s ? `${path}?${s}` : path
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

// --- Main component ---

function todayValue() {
  return new Date().toISOString().slice(0, 10)
}
