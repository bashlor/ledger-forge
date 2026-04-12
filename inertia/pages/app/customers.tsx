import { Head, router } from '@inertiajs/react'
import { useMemo, useState } from 'react'

import type { CreateCustomerInput, CustomerDto } from '~/lib/types'

import { DrawerPanel } from '~/components/drawer_panel'
import { PageHeader } from '~/components/page_header'
import { formatCurrency } from '~/lib/format'

import type { InertiaProps } from '../../types'

const initialForm: CreateCustomerInput = {
  company: '',
  email: '',
  name: '',
  note: '',
  phone: '',
}

export default function CustomersPage({
  customers,
}: InertiaProps<{ customers: CustomerDto[] }>) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState<CreateCustomerInput>(initialForm)
  const [processing, setProcessing] = useState(false)

  const summary = useMemo(() => {
    const totalInvoiced = customers.reduce((sum, customer) => sum + (customer.totalInvoiced ?? 0), 0)
    const linkedCustomers = customers.filter((customer) => (customer.invoiceCount ?? 0) > 0).length

    return { linkedCustomers, totalInvoiced }
  }, [customers])

  function closeDrawer() {
    setDrawerOpen(false)
    setForm(initialForm)
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    router.post('/customers', form as never, {
      onFinish: () => setProcessing(false),
      onStart: () => setProcessing(true),
      onSuccess: () => closeDrawer(),
      preserveScroll: true,
    })
  }

  function handleDelete(customer: CustomerDto) {
    if (customer.canDelete === false) return
    if (!window.confirm(`Delete customer "${customer.company}"?`)) return

    router.delete(`/customers/${customer.id}`, {
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
              onClick={() => setDrawerOpen(true)}
              type="button"
            >
              New customer
            </button>
          }
          description="Customers are your billable contacts. Deletion is blocked once an invoice references a customer."
          eyebrow="Directory"
          title="Customers"
        />

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-surface-container-low p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">
              Customers
            </p>
            <p className="mt-3 text-3xl font-headline font-extrabold text-on-surface">
              {customers.length}
            </p>
            <p className="mt-1 text-sm text-on-surface-variant">Contacts in the system</p>
          </div>
          <div className="rounded-xl bg-surface-container-low p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">
              With invoices
            </p>
            <p className="mt-3 text-3xl font-headline font-extrabold text-on-surface">
              {summary.linkedCustomers}
            </p>
            <p className="mt-1 text-sm text-on-surface-variant">
              Customers with at least one invoice
            </p>
          </div>
          <div className="rounded-xl bg-surface-container-low p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">
              Total invoiced
            </p>
            <p className="mt-3 text-3xl font-headline font-extrabold text-on-surface">
              {formatCurrency(summary.totalInvoiced)}
            </p>
            <p className="mt-1 text-sm text-on-surface-variant">Excluding drafts</p>
          </div>
        </div>

        <DrawerPanel
          description="Add a contact that can be selected when creating an invoice."
          footer={
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                className="rounded-lg bg-surface-container-highest px-4 py-3 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-high"
                onClick={closeDrawer}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-lg px-4 py-3 text-sm font-medium text-on-primary milled-steel-gradient transition-all hover:opacity-95 disabled:opacity-60"
                disabled={processing}
                form="customer-form"
                type="submit"
              >
                {processing ? 'Saving…' : 'Save'}
              </button>
            </div>
          }
          icon="person_add"
          onClose={closeDrawer}
          open={drawerOpen}
          title="Create customer"
        >
          <form className="grid gap-4 sm:grid-cols-2" id="customer-form" onSubmit={handleSubmit}>
            <div className="sm:col-span-2">
              <label
                className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant"
                htmlFor="customer-company"
              >
                Company
              </label>
              <input
                className="w-full rounded-xl border border-outline-variant/35 bg-white px-3 py-3 text-sm text-on-surface outline-hidden transition-colors focus:border-primary"
                id="customer-company"
                onChange={(event) =>
                  setForm((current) => ({ ...current, company: event.target.value }))
                }
                required
                type="text"
                value={form.company}
              />
            </div>

            <div>
              <label
                className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant"
                htmlFor="customer-name"
              >
                Contact
              </label>
              <input
                className="w-full rounded-xl border border-outline-variant/35 bg-white px-3 py-3 text-sm text-on-surface outline-hidden transition-colors focus:border-primary"
                id="customer-name"
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                required
                type="text"
                value={form.name}
              />
            </div>

            <div>
              <label
                className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant"
                htmlFor="customer-phone"
              >
                Phone
              </label>
              <input
                className="w-full rounded-xl border border-outline-variant/35 bg-white px-3 py-3 text-sm text-on-surface outline-hidden transition-colors focus:border-primary"
                id="customer-phone"
                onChange={(event) =>
                  setForm((current) => ({ ...current, phone: event.target.value }))
                }
                required
                type="tel"
                value={form.phone}
              />
            </div>

            <div className="sm:col-span-2">
              <label
                className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant"
                htmlFor="customer-email"
              >
                Email
              </label>
              <input
                className="w-full rounded-xl border border-outline-variant/35 bg-white px-3 py-3 text-sm text-on-surface outline-hidden transition-colors focus:border-primary"
                id="customer-email"
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
                required
                type="email"
                value={form.email}
              />
            </div>

            <div className="sm:col-span-2">
              <label
                className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant"
                htmlFor="customer-note"
              >
                Note
              </label>
              <textarea
                className="w-full rounded-xl border border-outline-variant/35 bg-white px-3 py-3 text-sm text-on-surface outline-hidden transition-colors focus:border-primary"
                id="customer-note"
                onChange={(event) =>
                  setForm((current) => ({ ...current, note: event.target.value }))
                }
                rows={3}
                value={form.note ?? ''}
              />
            </div>
          </form>
        </DrawerPanel>

        <section className="overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-ambient-tight">
          <div className="border-b border-outline-variant/10 px-4 py-3">
            <h2 className="text-base font-semibold text-on-surface">Customer register</h2>
          </div>

          {customers.length === 0 ? (
            <div className="px-4 py-8">
              <div className="rounded-lg border border-dashed border-outline-variant/35 bg-surface-container-low px-4 py-5 text-sm text-on-surface-variant">
                No customers yet. Add a contact before creating invoices.
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-outline-variant/15 bg-surface-container-low text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
                    <th className="px-4 py-3 font-medium">Company</th>
                    <th className="px-4 py-3 font-medium">Contact</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="px-4 py-3 text-right font-medium">Invoices</th>
                    <th className="px-4 py-3 text-right font-medium">Invoiced</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {customers.map((customer) => (
                    <tr key={customer.id}>
                      <td className="px-4 py-3 font-medium text-on-surface">
                        <div>{customer.company}</div>
                        {customer.note ? (
                          <div className="text-xs text-on-surface-variant">{customer.note}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-on-surface">{customer.name}</td>
                      <td className="px-4 py-3 text-on-surface-variant">{customer.email}</td>
                      <td className="px-4 py-3 text-on-surface-variant">{customer.phone}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-on-surface">
                        {customer.invoiceCount ?? 0}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-on-surface">
                        {formatCurrency(customer.totalInvoiced ?? 0)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          className="rounded border border-error/20 px-3 py-1.5 text-xs font-semibold text-error transition-colors hover:bg-error-container/25 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={processing || customer.canDelete === false}
                          onClick={() => handleDelete(customer)}
                          title={customer.deleteBlockReason}
                          type="button"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  )
}
