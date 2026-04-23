import { Head, router, usePage } from '@inertiajs/react'
import { useMemo, useState } from 'react'

import type {
  CreateCustomerInput,
  CustomerDto,
  CustomerListDto,
  CustomerListItemDto,
} from '~/lib/types'
import type { FormErrors } from '~/types'

import { DataTable } from '~/components/data_table'
import { ErrorBanner } from '~/components/error_banner'
import { PageHeader } from '~/components/page_header'
import { DEFAULT_PAGE_SIZE } from '~/lib/pagination'

import type { InertiaProps } from '../../types'

import { CustomerDrawer } from './customers/customer_drawer'
import { SummaryCards } from './customers/summary_cards'
import { CustomerTable } from './customers/table'

interface CustomerSearchFormProps {
  appliedSearch: string
  onSubmit: (searchQuery: string) => void
}

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

  function openCreate() {
    if (!canMutateCustomers) return
    setEditTarget(null)
    setDrawerKey((k) => k + 1)
    setDrawerOpen(true)
  }

  function openEdit(customer: CustomerListItemDto) {
    if (!canMutateCustomers) return
    setEditTarget(customer)
    setDrawerKey((k) => k + 1)
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setEditTarget(null)
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
    if (!window.confirm(`Delete customer "${customer.company}"?`)) return

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

  return (
    <>
      <Head title="Customers" />

      <div className="space-y-4 lg:space-y-5">
        {accountingReadOnly ? <ErrorBanner message={accountingReadOnlyMessage} /> : null}

        <PageHeader
          actions={
            canManageCustomers ? (
              <button
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-on-primary shadow-sm milled-steel-gradient transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={accountingReadOnly}
                onClick={openCreate}
                type="button"
              >
                New customer
              </button>
            ) : null
          }
          className="gap-3"
          description="Customers are your billable contacts. Deletion is blocked once an invoice references a customer."
          eyebrow="Directory"
          title="Customers"
        />

        <SummaryCards summary={summary} />

        <CustomerDrawer
          errors={customerErrors}
          key={drawerKey}
          onClose={closeDrawer}
          onSubmit={handleSubmit}
          open={isDrawerOpen}
          processing={processing}
          readOnly={accountingReadOnly}
          readOnlyMessage={accountingReadOnlyMessage}
          target={editTarget}
        />

        <DataTable
          emptyMessage="No customers yet."
          headerContent={
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <CustomerSearchForm
                appliedSearch={appliedSearch}
                key={appliedSearch}
                onSubmit={submitSearch}
              />
              <select
                aria-label="Filter customers"
                className="h-9 rounded-lg border border-outline-variant/35 bg-surface px-3 text-sm text-on-surface outline-hidden transition-colors focus:border-primary"
                onChange={(event) =>
                  setFilter(event.target.value as 'all' | 'no_invoices' | 'with_invoices')
                }
                value={filter}
              >
                <option value="all">All customers</option>
                <option value="with_invoices">With invoices</option>
                <option value="no_invoices">No invoices</option>
              </select>
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
          title="Customer register"
        >
          {filteredItems.length === 0 ? (
            <div className="px-4 py-8">
              <div className="rounded-lg border border-dashed border-outline-variant/35 bg-surface-container-low px-4 py-5 text-sm text-on-surface-variant">
                No customers match the current filters on this page.
              </div>
            </div>
          ) : (
            <CustomerTable
              canManageCustomers={canManageCustomers}
              items={filteredItems}
              onDelete={handleDelete}
              onEdit={openEdit}
              processing={processing}
              readOnly={accountingReadOnly}
            />
          )}
        </DataTable>
      </div>
    </>
  )
}

function CustomerSearchForm({ appliedSearch, onSubmit }: CustomerSearchFormProps) {
  const [searchQuery, setSearchQuery] = useState(appliedSearch)

  return (
    <form
      className="flex w-full gap-2 sm:w-auto"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(searchQuery)
      }}
    >
      <input
        aria-label="Search customers"
        className="h-9 w-full rounded-lg border border-outline-variant/35 bg-surface px-3 text-sm text-on-surface outline-hidden transition-colors placeholder:text-on-surface-variant/80 focus:border-primary sm:w-64"
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder="Search company, contact, email, phone"
        type="search"
        value={searchQuery}
      />
      <button
        className="rounded-lg border border-outline-variant/35 px-3 text-sm text-on-surface"
        type="submit"
      >
        Search
      </button>
    </form>
  )
}
