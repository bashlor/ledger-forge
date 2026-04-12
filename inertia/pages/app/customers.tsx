import { Head, router } from '@inertiajs/react'
import { useMemo, useState } from 'react'

import type { CreateCustomerInput, CustomerDto, CustomerListDto } from '~/lib/types'

import { DataTable } from '~/components/data_table'
import { PageHeader } from '~/components/page_header'

import type { InertiaProps } from '../../types'

import { CustomerDrawer } from './customers/customer_drawer'
import { SummaryCards } from './customers/summary_cards'
import { CustomerTable } from './customers/table'

export default function CustomersPage({
  customers,
}: InertiaProps<{ customers: CustomerListDto }>) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerKey, setDrawerKey] = useState(0)
  const [editTarget, setEditTarget] = useState<CustomerDto | null>(null)
  const [processing, setProcessing] = useState(false)

  const { items, pagination, summary } = customers

  const pageQs = useMemo(() => {
    return pagination.page > 1 ? { page: pagination.page } : {}
  }, [pagination.page])

  function openCreate() {
    setEditTarget(null)
    setDrawerKey((k) => k + 1)
    setDrawerOpen(true)
  }

  function openEdit(customer: CustomerDto) {
    setEditTarget(customer)
    setDrawerKey((k) => k + 1)
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setEditTarget(null)
  }

  function handleSubmit(form: CreateCustomerInput, editingId: null | string) {
    const options = {
      onFinish: () => setProcessing(false),
      onStart: () => setProcessing(true),
      onSuccess: () => closeDrawer(),
      preserveScroll: true,
    }

    const payload = { ...form, ...pageQs } as never

    if (editingId) {
      router.put(`/customers/${editingId}`, payload, options)
    } else {
      router.post('/customers', payload, options)
    }
  }

  function handleDelete(customer: CustomerDto) {
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

      <div className="space-y-8">
        <PageHeader
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
          key={drawerKey}
          onClose={closeDrawer}
          onSubmit={handleSubmit}
          open={drawerOpen}
          processing={processing}
          target={editTarget}
        />

        <DataTable
          emptyMessage="No customers yet. Add a contact before creating invoices."
          isEmpty={items.length === 0}
          onPageChange={(nextPage) =>
            router.get(
              '/customers',
              nextPage > 1 ? { page: nextPage } : {},
              { only: ['customers'], preserveScroll: true, replace: true }
            )
          }
          pagination={pagination}
          title="Customer register"
        >
          <CustomerTable
            items={items}
            onDelete={handleDelete}
            onEdit={openEdit}
            processing={processing}
          />
        </DataTable>
      </div>
    </>
  )
}
