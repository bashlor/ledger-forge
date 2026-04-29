import { Head, router, usePage } from '@inertiajs/react'
import { useMemo, useState } from 'react'

import type {
  CreateCustomerInput,
  CustomerDto,
  CustomerListDto,
  CustomerListItemDto,
} from '~/lib/types'
import type { FormErrors } from '~/types'

import { ActiveSearchFilter } from '~/components/active_search_filter'
import { PrimaryButton } from '~/components/button'
import { DataTable } from '~/components/data_table'
import { EmptyState } from '~/components/empty_state'
import { ErrorBanner } from '~/components/error_banner'
import { FilterSelect } from '~/components/filter_select'
import { PageHeader } from '~/components/page_header'
import { SearchForm } from '~/components/search_form'
import { DEFAULT_PAGE_SIZE } from '~/lib/pagination'

import type { InertiaProps } from '../../types'

import { CustomerDrawer, type CustomerDrawerMode } from './customers/customer_drawer'
import { SummaryCards } from './customers/summary_cards'
import { CustomerTable } from './customers/table'

const CUSTOMER_FILTER_OPTIONS = [
  { label: 'All customers', value: 'all' },
  { label: 'With invoices', value: 'with_invoices' },
  { label: 'No invoices', value: 'no_invoices' },
] as const

interface CustomersPageProps {
  accountingReadOnly: boolean
  accountingReadOnlyMessage: string
  canManageCustomers: boolean
  customers: CustomerListDto
  filters?: { search?: string }
}

export default function CustomersPage({
  accountingReadOnly,
  accountingReadOnlyMessage,
  canManageCustomers,
  customers,
  filters,
}: InertiaProps<CustomersPageProps>) {
  const { errors } =
    usePage<InertiaProps<{ customers: CustomerListDto; errors?: FormErrors }>>().props
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerKey, setDrawerKey] = useState(0)
  const [drawerMode, setDrawerMode] = useState<CustomerDrawerMode>('create')
  const [editTarget, setEditTarget] = useState<CustomerDto | null>(null)
  const [processing, setProcessing] = useState(false)
  const [filter, setFilter] = useState<'all' | 'no_invoices' | 'with_invoices'>('all')

  const { items, pagination, summary } = customers
  const appliedSearch = filters?.search?.trim() ?? ''
  const hasPageItems = items.length > 0
  const canMutateCustomers = canManageCustomers && !accountingReadOnly
  const filteredItems = useMemo(
    () =>
      items.filter((customer) => {
        const matchesFilter =
          filter === 'all'
            ? true
            : filter === 'with_invoices'
              ? customer.invoiceCount > 0
              : customer.invoiceCount === 0
        return matchesFilter
      }),
    [filter, items]
  )

  const pageQs = useMemo(() => {
    const qs: Record<string, number | string> = {}
    if (pagination.page > 1) {
      qs.page = pagination.page
    }
    if (pagination.perPage !== DEFAULT_PAGE_SIZE) {
      qs.perPage = pagination.perPage
    }
    if (appliedSearch) {
      qs.search = appliedSearch
    }
    return qs
  }, [appliedSearch, pagination.page, pagination.perPage])
  const customerErrors = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(errors ?? {}).filter(([key]) =>
          ['address', 'company', 'email', 'name', 'note', 'phone'].includes(key)
        )
      ) as FormErrors,
    [errors]
  )
  const hasCustomerErrors = Object.keys(customerErrors).length > 0
  const isDrawerOpen = drawerOpen || (canManageCustomers && hasCustomerErrors)

  const resolvedDrawerMode: CustomerDrawerMode = editTarget === null ? 'create' : drawerMode

  function openCreate() {
    if (!canMutateCustomers) return
    setEditTarget(null)
    setDrawerMode('create')
    setDrawerKey((k) => k + 1)
    setDrawerOpen(true)
  }

  function openEdit(customer: CustomerListItemDto) {
    if (!canMutateCustomers) return
    setEditTarget(customer)
    setDrawerMode('edit')
    setDrawerKey((k) => k + 1)
    setDrawerOpen(true)
  }

  function openView(customer: CustomerListItemDto) {
    if (!canManageCustomers) return
    setEditTarget(customer)
    setDrawerMode('view')
    setDrawerKey((k) => k + 1)
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setEditTarget(null)
    setDrawerMode('create')
  }

  function handleSubmit(form: CreateCustomerInput, editingId: null | string) {
    if (!canMutateCustomers) return
    const normalized = {
      ...form,
      email: form.email?.trim() || undefined,
      phone: form.phone?.trim() || undefined,
    }
    const options = {
      onFinish: () => setProcessing(false),
      onStart: () => setProcessing(true),
      onSuccess: () => closeDrawer(),
      preserveScroll: true,
    }

    const payload = { ...normalized, ...pageQs } as never

    if (editingId) {
      router.put(`/customers/${editingId}`, payload, options)
    } else {
      router.post('/customers', payload, options)
    }
  }

  function handleDelete(customer: CustomerListItemDto) {
    if (!canMutateCustomers) return
    if (customer.canDelete === false) return

    router.delete(`/customers/${customer.id}`, {
      data: pageQs,
      onFinish: () => setProcessing(false),
      onStart: () => setProcessing(true),
      preserveScroll: true,
    })
  }

  function submitSearch(searchQuery: string) {
    const search = searchQuery.trim()
    router.get(
      '/customers',
      {
        ...(pagination.perPage !== DEFAULT_PAGE_SIZE ? { perPage: pagination.perPage } : {}),
        ...(search ? { search } : {}),
      },
      { only: ['customers', 'filters'], preserveScroll: true, replace: true }
    )
  }

  function clearSearch() {
    submitSearch('')
  }

  return (
    <>
      <Head title="Customers" />

      <div className="space-y-5">
        {accountingReadOnly ? <ErrorBanner message={accountingReadOnlyMessage} /> : null}

        <PageHeader
          actions={
            canManageCustomers ? (
              <PrimaryButton disabled={accountingReadOnly} onClick={openCreate}>
                New customer
              </PrimaryButton>
            ) : null
          }
          className="sm:gap-4"
          description="Customers are your billable contacts. Deletion is blocked once an invoice references a customer."
          eyebrow="Directory"
          title="Customers"
        />

        <SummaryCards summary={summary} />

        <CustomerDrawer
          errors={customerErrors}
          key={drawerKey}
          mode={resolvedDrawerMode}
          onClose={closeDrawer}
          onRequestEditMode={() => setDrawerMode('edit')}
          onSubmit={handleSubmit}
          open={isDrawerOpen}
          processing={processing}
          readOnly={accountingReadOnly}
          readOnlyMessage={accountingReadOnlyMessage}
          target={editTarget}
        />

        <DataTable
          emptyMessage={
            appliedSearch
              ? `No customers match "${appliedSearch}" on this page.`
              : 'No customers yet.'
          }
          headerClassName="border-b border-slate-200/90 bg-white px-5 py-4 sm:px-6"
          headerContent={
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center">
                <SearchForm
                  ariaLabel="Search customers"
                  onSubmit={submitSearch}
                  placeholder="Search company, contact, email, phone"
                  value={appliedSearch}
                  variant="premium"
                />
                <FilterSelect
                  aria-label="Filter customers"
                  onChange={(event) =>
                    setFilter(event.target.value as 'all' | 'no_invoices' | 'with_invoices')
                  }
                  options={CUSTOMER_FILTER_OPTIONS}
                  value={filter}
                />
              </div>
              <ActiveSearchFilter onClear={clearSearch} query={appliedSearch} />
            </div>
          }
          isEmpty={!hasPageItems}
          onPageChange={(nextPage) =>
            router.get(
              '/customers',
              {
                ...(nextPage > 1 ? { page: nextPage } : {}),
                ...(pagination.perPage !== DEFAULT_PAGE_SIZE
                  ? { perPage: pagination.perPage }
                  : {}),
                ...(appliedSearch ? { search: appliedSearch } : {}),
              },
              {
                only: ['customers', 'filters'],
                preserveScroll: true,
                replace: true,
              }
            )
          }
          onPerPageChange={(perPage) =>
            router.get(
              '/customers',
              {
                ...(perPage !== DEFAULT_PAGE_SIZE ? { perPage } : {}),
                ...(appliedSearch ? { search: appliedSearch } : {}),
              },
              { only: ['customers', 'filters'], preserveScroll: true, replace: true }
            )
          }
          pagination={pagination}
          panelClassName="overflow-hidden rounded-xl border border-slate-200/95 bg-white shadow-md shadow-slate-900/[0.06] ring-1 ring-slate-900/[0.04]"
          title="Customer register"
          titleClassName="text-slate-950 lg:text-base"
          toolbarClassName="gap-3"
        >
          {filteredItems.length === 0 ? (
            <EmptyState message="No customers match the current filters on this page." />
          ) : (
            <CustomerTable
              canManageCustomers={canManageCustomers}
              items={filteredItems}
              onDelete={handleDelete}
              onEdit={openEdit}
              onView={openView}
              processing={processing}
              readOnly={accountingReadOnly}
              searchQuery={appliedSearch}
            />
          )}
        </DataTable>
      </div>
    </>
  )
}
