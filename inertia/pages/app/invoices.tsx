import { Head, router } from '@inertiajs/react'
import { useEffect, useMemo, useRef, useState } from 'react'

import type {
  CreateInvoiceInput,
  CustomerSelectDto,
  DateScope,
  InvoiceAuditEventDto,
  InvoiceDto,
  InvoiceLineInput,
  InvoicePreviewDto,
  InvoiceSummaryDto,
  PaginatedList,
  PaginationMetaDto,
} from '~/lib/types'

import { AppIcon } from '~/components/app_icon'
import { PrimaryButton } from '~/components/button'
import { useDateScope } from '~/components/date_scope_provider'
import { DateScopeSummary } from '~/components/date_scope_summary'
import { ErrorBanner } from '~/components/error_banner'
import { PageHeader } from '~/components/page_header'
import { addDaysDateOnlyUtc, todayDateOnlyUtc } from '~/lib/date'
import { formatCurrency } from '~/lib/format'
import { canEditInvoice, canIssueInvoice, createEmptyInvoiceLine } from '~/lib/invoices'
import { DEFAULT_PAGE_SIZE } from '~/lib/pagination'

import type { InertiaProps } from '../../types'
import type { EditableInvoiceLine } from './invoices/invoice_draft_editor'

import { InvoiceDraftEditor } from './invoices/invoice_draft_editor'
import { InvoiceHistoryDrawer } from './invoices/invoice_history_drawer'
import { InvoiceList } from './invoices/invoice_list'
import { InvoiceView } from './invoices/invoice_view'
import { IssueInvoiceDialog } from './invoices/issue_invoice_dialog'

interface InvoiceHistoryState {
  errorMessage: null | string
  events: InvoiceAuditEventDto[]
  loading: boolean
  open: boolean
}

interface InvoicesPageProps {
  accountingReadOnly: boolean
  accountingReadOnlyMessage: string
  canViewAuditHistory: boolean
  customers: CustomerSelectDto[]
  filters?: { search?: string }
  initialCustomerId: null | string
  initialInvoiceId: null | string
  invoices: PaginatedList<InvoiceDto>
  invoiceSummary?: InvoiceSummaryDto
  mode: 'new' | 'view'
  vatRates: number[]
}

const INITIAL_HISTORY_STATE: InvoiceHistoryState = {
  errorMessage: null,
  events: [],
  loading: false,
  open: false,
}

const EMPTY_INVOICE_PREVIEW: InvoicePreviewDto = {
  lines: [],
  subtotalExclTax: 0,
  totalInclTax: 0,
  totalVat: 0,
}

export default function InvoicesPage(props: InertiaProps<InvoicesPageProps>) {
  const resetKey = `${props.mode}|${props.initialInvoiceId}|${props.initialCustomerId}|${props.canViewAuditHistory ? '1' : '0'}|${props.filters?.search ?? ''}|${props.invoices.items.map((i) => i.id).join(':')}|${props.invoices.pagination.page}|${props.invoices.pagination.perPage}`
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

function buildPreviewPayload(
  lines: EditableInvoiceLine[]
): null | Pick<CreateInvoiceInput, 'lines'> {
  const normalizedLines = lines.map((line) => ({
    description: line.description.trim(),
    quantity: Number(line.quantity),
    unitPrice: Number(line.unitPrice),
    vatRate: Number(line.vatRate),
  }))

  if (
    normalizedLines.length === 0 ||
    normalizedLines.some(
      (line) =>
        !line.description ||
        !Number.isFinite(line.quantity) ||
        line.quantity <= 0 ||
        !Number.isFinite(line.unitPrice) ||
        line.unitPrice < 0 ||
        !Number.isFinite(line.vatRate)
    )
  ) {
    return null
  }

  return { lines: normalizedLines }
}

function createEditableLine(line?: InvoiceLineInput): EditableInvoiceLine {
  return {
    key: crypto.randomUUID(),
    ...(line ?? createEmptyInvoiceLine()),
  }
}

function createInitialForm(customerId = '') {
  const issueDate = todayDateOnlyUtc()
  return {
    customerId,
    dueDate: addDaysDateOnlyUtc(issueDate, 15),
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
  accountingReadOnly,
  accountingReadOnlyMessage,
  canViewAuditHistory,
  customers,
  filters,
  initialCustomerId,
  initialInvoiceId,
  invoices,
  invoiceSummary,
  mode,
  vatRates,
}: InertiaProps<InvoicesPageProps>) {
  const { scope } = useDateScope()
  const cachedInvoiceSummary = useRef<InvoiceSummaryDto | null>(null)
  if (invoiceSummary) {
    cachedInvoiceSummary.current = invoiceSummary
  }

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
  const [historyState, setHistoryState] = useState(INITIAL_HISTORY_STATE)
  const [invoicePreview, setInvoicePreview] = useState<InvoicePreviewDto>(() =>
    initialState.selectedInvoiceId
      ? invoiceToPreview(
          invoices.items.find((invoice) => invoice.id === initialState.selectedInvoiceId)
        )
      : EMPTY_INVOICE_PREVIEW
  )
  const [invoicePreviewError, setInvoicePreviewError] = useState<null | string>(null)
  const historyAbortRef = useRef<AbortController | null>(null)
  const appliedSearch = filters?.search?.trim() ?? ''

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
      {
        ...(initialCustomerId ? { customer: initialCustomerId } : {}),
        endDate: scope.endDate,
        ...(invoices.pagination.perPage !== DEFAULT_PAGE_SIZE
          ? { perPage: invoices.pagination.perPage }
          : {}),
        ...(appliedSearch ? { search: appliedSearch } : {}),
        startDate: scope.startDate,
      },
      { preserveScroll: true, preserveState: true, replace: true }
    )
  }, [scope.endDate, scope.startDate])

  const selectedInvoice = useMemo(
    () => invoices.items.find((invoice) => invoice.id === selectedInvoiceId) ?? null,
    [invoices.items, selectedInvoiceId]
  )
  const editingInvoice = selectedInvoice && canEditInvoice(selectedInvoice)
  const effectiveCustomerId = form.customerId || customers[0]?.id || ''
  const previewPayload = useMemo(() => buildPreviewPayload(form.lines), [form.lines])
  const displayedInvoicePreview = previewPayload ? invoicePreview : EMPTY_INVOICE_PREVIEW
  const displayedInvoicePreviewError = previewPayload ? invoicePreviewError : null
  const summary = cachedInvoiceSummary.current

  useEffect(() => {
    return () => historyAbortRef.current?.abort()
  }, [])

  useEffect(() => {
    if (accountingReadOnly) {
      return
    }

    if (!previewPayload) {
      return
    }

    const controller = new AbortController()
    async function refreshPreview() {
      try {
        const response = await fetch('/invoices/preview', {
          body: JSON.stringify(previewPayload),
          credentials: 'same-origin',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...xsrfHeaders(),
          },
          method: 'POST',
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error('Invoice totals could not be recalculated.')
        }

        const payload = (await response.json()) as InvoicePreviewDto
        if (!controller.signal.aborted) {
          setInvoicePreview(payload)
          setInvoicePreviewError(null)
        }
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        setInvoicePreview(EMPTY_INVOICE_PREVIEW)
        setInvoicePreviewError(
          error instanceof Error ? error.message : 'Invoice totals could not be recalculated.'
        )
      }
    }

    void refreshPreview()

    return () => controller.abort()
  }, [accountingReadOnly, previewPayload])

  function resetHistoryState() {
    historyAbortRef.current?.abort()
    setHistoryState(INITIAL_HISTORY_STATE)
  }

  // --- Navigation ---

  function handleCreateDraft() {
    if (accountingReadOnly) return
    resetHistoryState()
    setIsCreating(true)
    setSelectedInvoiceId(null)
    setForm(createInitialForm(customers[0]?.id ?? ''))
    setInvoicePreview(EMPTY_INVOICE_PREVIEW)
    setInvoicePreviewError(null)
    router.get(
      '/invoices',
      {
        ...(initialCustomerId ? { customer: initialCustomerId } : {}),
        endDate: scope.endDate,
        mode: 'new',
        ...(invoices.pagination.perPage !== DEFAULT_PAGE_SIZE
          ? { perPage: invoices.pagination.perPage }
          : {}),
        ...(appliedSearch ? { search: appliedSearch } : {}),
        startDate: scope.startDate,
      },
      { preserveScroll: true }
    )
  }

  function handleBackToInvoices() {
    resetHistoryState()
    router.get(
      '/invoices',
      {
        ...(initialCustomerId ? { customer: initialCustomerId } : {}),
        endDate: scope.endDate,
        ...(invoices.pagination.perPage !== DEFAULT_PAGE_SIZE
          ? { perPage: invoices.pagination.perPage }
          : {}),
        ...(appliedSearch ? { search: appliedSearch } : {}),
        startDate: scope.startDate,
      },
      { preserveScroll: true }
    )
  }

  function handleSelectInvoice(invoice: InvoiceDto) {
    resetHistoryState()
    setInvoicePreview(invoiceToPreview(invoice))
    setInvoicePreviewError(null)
    router.get(
      '/invoices',
      {
        ...(initialCustomerId ? { customer: initialCustomerId } : {}),
        endDate: scope.endDate,
        invoice: invoice.id,
        ...(invoices.pagination.page > 1 ? { page: invoices.pagination.page } : {}),
        ...(invoices.pagination.perPage !== DEFAULT_PAGE_SIZE
          ? { perPage: invoices.pagination.perPage }
          : {}),
        ...(appliedSearch ? { search: appliedSearch } : {}),
        startDate: scope.startDate,
      },
      { preserveScroll: true }
    )
  }

  function handleCloseHistory() {
    historyAbortRef.current?.abort()
    setHistoryState((current) => ({ ...current, loading: false, open: false }))
  }

  async function handleOpenHistory() {
    if (!selectedInvoice || !canViewAuditHistory) return

    const invoiceId = selectedInvoice.id
    historyAbortRef.current?.abort()
    const controller = new AbortController()
    historyAbortRef.current = controller

    setHistoryState({
      errorMessage: null,
      events: [],
      loading: true,
      open: true,
    })

    try {
      const response = await fetch(`/invoices/${invoiceId}/history`, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      })

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('You do not have access to this audit history.')
        }
        if (response.status === 404) {
          throw new Error('This invoice history is no longer available.')
        }
        throw new Error('The audit history subsystem is temporarily degraded.')
      }

      const payload = (await response.json()) as { events: InvoiceAuditEventDto[] }
      if (controller.signal.aborted) {
        return
      }

      setHistoryState({
        errorMessage: null,
        events: payload.events,
        loading: false,
        open: true,
      })
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return
      }

      setHistoryState({
        errorMessage:
          error instanceof Error
            ? error.message
            : 'The audit history subsystem is temporarily degraded.',
        events: [],
        loading: false,
        open: true,
      })
    }
  }

  function handlePageChange(page: number) {
    router.get(
      '/invoices',
      {
        ...(initialCustomerId ? { customer: initialCustomerId } : {}),
        endDate: scope.endDate,
        page,
        ...(invoices.pagination.perPage !== DEFAULT_PAGE_SIZE
          ? { perPage: invoices.pagination.perPage }
          : {}),
        ...(appliedSearch ? { search: appliedSearch } : {}),
        startDate: scope.startDate,
      },
      { only: ['invoices', 'invoiceSummary', 'filters'], preserveScroll: true, preserveState: true }
    )
  }

  function handlePerPageChange(perPage: number) {
    router.get(
      '/invoices',
      {
        ...(initialCustomerId ? { customer: initialCustomerId } : {}),
        endDate: scope.endDate,
        ...(perPage !== DEFAULT_PAGE_SIZE ? { perPage } : {}),
        ...(appliedSearch ? { search: appliedSearch } : {}),
        startDate: scope.startDate,
      },
      {
        only: ['invoices', 'invoiceSummary', 'filters'],
        preserveScroll: true,
        preserveState: true,
        replace: true,
      }
    )
  }

  function handleSearchSubmit(searchQuery: string) {
    router.get(
      '/invoices',
      {
        ...(initialCustomerId ? { customer: initialCustomerId } : {}),
        endDate: scope.endDate,
        ...(invoices.pagination.perPage !== DEFAULT_PAGE_SIZE
          ? { perPage: invoices.pagination.perPage }
          : {}),
        ...(searchQuery.trim() ? { search: searchQuery.trim() } : {}),
        startDate: scope.startDate,
      },
      {
        only: ['invoices', 'invoiceSummary', 'filters'],
        preserveScroll: true,
        preserveState: true,
        replace: true,
      }
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
    if (accountingReadOnly) return
    resetHistoryState()
    const payload = buildPayload({ ...form, customerId: effectiveCustomerId })
    const path =
      selectedInvoice && editingInvoice ? `/invoices/${selectedInvoice.id}/draft` : '/invoices'
    const url = invoicesUrl(path, scope, invoices.pagination, initialCustomerId, appliedSearch)

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
    if (!selectedInvoice || accountingReadOnly) return
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
    if (!selectedInvoice || accountingReadOnly) return
    resetHistoryState()
    router.post(
      invoicesUrl(
        `/invoices/${selectedInvoice.id}/issue`,
        scope,
        invoices.pagination,
        initialCustomerId,
        appliedSearch
      ),
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
    if (!selectedInvoice || accountingReadOnly) return
    resetHistoryState()
    router.post(
      invoicesUrl(
        `/invoices/${selectedInvoice.id}/mark-paid`,
        scope,
        invoices.pagination,
        initialCustomerId,
        appliedSearch
      ),
      {},
      {
        onFinish: () => setSaving(false),
        onStart: () => setSaving(true),
        preserveScroll: true,
      }
    )
  }

  function handleDeleteDraftFromList(invoice: InvoiceDto) {
    if (accountingReadOnly) return
    if (deleteConfirmId !== invoice.id) {
      setDeleteConfirmId(invoice.id)
      return
    }
    resetHistoryState()
    setDeleteConfirmId(null)
    router.delete(
      invoicesUrl(
        `/invoices/${invoice.id}`,
        scope,
        invoices.pagination,
        initialCustomerId,
        appliedSearch
      ),
      {
        onFinish: () => setSaving(false),
        onStart: () => setSaving(true),
        preserveScroll: true,
      }
    )
  }

  function handleDeleteDraft() {
    if (!selectedInvoice || accountingReadOnly) return
    resetHistoryState()
    router.delete(
      invoicesUrl(
        `/invoices/${selectedInvoice.id}`,
        scope,
        invoices.pagination,
        initialCustomerId,
        appliedSearch
      ),
      {
        onFinish: () => setSaving(false),
        onStart: () => setSaving(true),
        preserveScroll: true,
      }
    )
  }

  // --- Derived ---

  const minDueDate = editingInvoice ? selectedInvoice.createdAt : todayDateOnlyUtc()
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
        {accountingReadOnly ? <ErrorBanner message={accountingReadOnlyMessage} /> : null}

        {isFocusMode ? (
          <header className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
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
              </div>

              {selectedInvoice && canViewAuditHistory ? (
                <button
                  className="inline-flex items-center gap-2 self-start rounded-lg border border-outline-variant/35 bg-white px-4 py-2.5 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-low"
                  onClick={handleOpenHistory}
                  type="button"
                >
                  <AppIcon name="receipt_long" size={16} />
                  {historyState.loading && historyState.open ? 'Refreshing history…' : 'History'}
                </button>
              ) : null}
            </div>
          </header>
        ) : (
          <PageHeader
            actions={
              <PrimaryButton disabled={accountingReadOnly} onClick={handleCreateDraft}>
                New invoice
              </PrimaryButton>
            }
            description="Invoicing covers the main rules: drafts, issuing, payment, and conditional deletion."
            eyebrow="Invoicing"
            title="Invoices"
          />
        )}

        {!isFocusMode ? <DateScopeSummary /> : null}

        {!isFocusMode ? (
          <InvoiceList
            accountingReadOnly={accountingReadOnly}
            appliedSearch={appliedSearch}
            deleteConfirmId={deleteConfirmId}
            invoices={invoices}
            onCancelDelete={() => setDeleteConfirmId(null)}
            onDeleteDraft={handleDeleteDraftFromList}
            onPageChange={handlePageChange}
            onPerPageChange={handlePerPageChange}
            onSearchSubmit={handleSearchSubmit}
            onSelectInvoice={handleSelectInvoice}
            saving={saving}
            summary={summary}
          />
        ) : (
          <section className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-ambient-tight">
            {isCreating || editingInvoice ? (
              <InvoiceDraftEditor
                accountingReadOnly={accountingReadOnly}
                accountingReadOnlyMessage={accountingReadOnlyMessage}
                customers={customers}
                effectiveCustomerId={effectiveCustomerId}
                form={form}
                formIsValid={Boolean(formIsValid)}
                isCreating={isCreating}
                linePreviews={displayedInvoicePreview.lines}
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
                totals={displayedInvoicePreview}
                totalsErrorMessage={displayedInvoicePreviewError}
                vatRates={vatRates}
              />
            ) : selectedInvoice ? (
              <InvoiceView
                accountingReadOnly={accountingReadOnly}
                accountingReadOnlyMessage={accountingReadOnlyMessage}
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
        readOnly={accountingReadOnly}
        saving={saving}
      />

      <InvoiceHistoryDrawer
        errorMessage={historyState.errorMessage}
        events={historyState.events}
        invoice={selectedInvoice}
        loading={historyState.loading && historyState.open}
        onClose={handleCloseHistory}
        open={historyState.open}
      />
    </>
  )
}

function invoicesUrl(
  path: string,
  scope: DateScope,
  pagination: PaginationMetaDto,
  customerId?: null | string,
  search?: string
) {
  const params = new URLSearchParams({
    endDate: scope.endDate,
    startDate: scope.startDate,
  })
  if (customerId) {
    params.set('customer', customerId)
  }
  if (pagination.page > 1) {
    params.set('page', String(pagination.page))
  }
  if (pagination.perPage !== DEFAULT_PAGE_SIZE) {
    params.set('perPage', String(pagination.perPage))
  }
  if (search?.trim()) {
    params.set('search', search.trim())
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

function invoiceToPreview(invoice?: InvoiceDto): InvoicePreviewDto {
  if (!invoice) {
    return EMPTY_INVOICE_PREVIEW
  }

  return {
    lines: invoice.lines.map((line) => ({
      description: line.description,
      lineTotalExclTax: line.lineTotalExclTax,
      lineTotalInclTax: line.lineTotalInclTax,
      lineVatAmount: line.lineVatAmount,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      vatRate: line.vatRate,
    })),
    subtotalExclTax: invoice.subtotalExclTax,
    totalInclTax: invoice.totalInclTax,
    totalVat: invoice.totalVat,
  }
}

function xsrfHeaders(): Record<string, string> {
  const token = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith('XSRF-TOKEN='))
    ?.split('=')[1]

  return token ? { 'X-XSRF-TOKEN': decodeURIComponent(token) } : {}
}

// --- Main component ---
