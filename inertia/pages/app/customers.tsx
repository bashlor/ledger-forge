import { Head, router, usePage } from '@inertiajs/react'
import { useEffect, useMemo, useState } from 'react'

import type {
  CreateCustomerInput,
  CustomerDto,
  CustomerListDto,
  CustomerListItemDto,
} from '~/lib/types'
import type { FormErrors } from '~/types'

import { DataTable } from '~/components/data_table'
import { PageHeader } from '~/components/page_header'

import type { InertiaProps } from '../../types'

import { CustomerDrawer } from './customers/customer_drawer'
import { SummaryCards } from './customers/summary_cards'
import { CustomerTable } from './customers/table'

export default function CustomersPage({ customers }: InertiaProps<{ customers: CustomerListDto }>) {
  const { errors } =
    usePage<InertiaProps<{ customers: CustomerListDto; errors?: FormErrors }>>().props
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerKey, setDrawerKey] = useState(0)
  const [editTarget, setEditTarget] = useState<CustomerDto | null>(null)
  const [processing, setProcessing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'with_invoices' | 'no_invoices'>('all')

  const { items, pagination, summary } = customers
  const filteredItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    return items.filter((customer) => {
      const matchesFilter =
        filter === 'all'
          ? true
          : filter === 'with_invoices'
            ? customer.invoiceCount > 0
            : customer.invoiceCount === 0
      if (!matchesFilter) return false
      if (!normalizedQuery) return true

      return [customer.company, customer.name, customer.email, customer.phone]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)
    })
  }, [filter, items, searchQuery])

  const pageQs = useMemo(() => {
    return pagination.page > 1 ? { page: pagination.page } : {}
  }, [pagination.page])
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

  useEffect(() => {
    if (hasCustomerErrors) {
      setDrawerOpen(true)
      setEditTarget(null)
    }
  }, [hasCustomerErrors])

  function openCreate() {
    setEditTarget(null)
    setDrawerKey((k) => k + 1)
    setDrawerOpen(true)
  }

  function openEdit(customer: CustomerListItemDto) {
    setEditTarget(customer)
    setDrawerKey((k) => k + 1)
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setEditTarget(null)
  }

  function handleSubmit(form: CreateCustomerInput, editingId: null | string) {
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
    if (customer.canDelete === false) return
    if (!window.confirm(`Delete customer "${customer.company}"?`)) return

    router.delete(`/customers/${customer.id}`, {
      data: pageQs,
      onFinish: () => setProcessing(false),
      onStart: () => setProcessing(true),
      preserveScroll: true,
    })
  }

  return (
    <>
      <Head title="Customers" />

      <div className="space-y-4 lg:space-y-5">
        <PageHeader
          className="gap-3"
          actions={
            <button
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-on-primary shadow-sm milled-steel-gradient transition-all hover:opacity-95"
              onClick={openCreate}
              type="button"
            >
              New customer
            </button>
          }
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
          open={drawerOpen}
          processing={processing}
          target={editTarget}
        />

        <DataTable
          emptyMessage="No customers match the current filters."
          headerContent={
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <input
                className="h-9 w-full rounded-lg border border-outline-variant/35 bg-surface px-3 text-sm text-on-surface outline-hidden transition-colors placeholder:text-on-surface-variant/80 focus:border-primary sm:w-64"
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search company, contact, email, phone"
                type="search"
                value={searchQuery}
              />
              <select
                aria-label="Filter customers"
                className="h-9 rounded-lg border border-outline-variant/35 bg-surface px-3 text-sm text-on-surface outline-hidden transition-colors focus:border-primary"
                onChange={(event) =>
                  setFilter(event.target.value as 'all' | 'with_invoices' | 'no_invoices')
                }
                value={filter}
              >
                <option value="all">All customers</option>
                <option value="with_invoices">With invoices</option>
                <option value="no_invoices">No invoices</option>
              </select>
            </div>
          }
          isEmpty={filteredItems.length === 0}
          onPageChange={(nextPage) =>
            router.get('/customers', nextPage > 1 ? { page: nextPage } : {}, {
              only: ['customers'],
              preserveScroll: true,
              replace: true,
            })
          }
          pagination={pagination}
          title="Customer register"
        >
          <CustomerTable
            items={filteredItems}
            onDelete={handleDelete}
            onEdit={openEdit}
            processing={processing}
          />
        </DataTable>
      </div>
    </>
  )
}
