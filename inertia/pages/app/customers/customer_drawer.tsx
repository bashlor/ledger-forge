import { useState } from 'react'

import type { CreateCustomerInput, CustomerDto } from '~/lib/types'
import type { FormErrors } from '~/types'

import { DrawerPanel } from '~/components/drawer_panel'
import { ErrorBanner } from '~/components/error_banner'

const EMPTY_FORM: CreateCustomerInput = {
  address: '',
  company: '',
  email: '',
  name: '',
  note: '',
  phone: '',
}

interface CustomerDrawerProps {
  errors: FormErrors
  onClose: () => void
  onSubmit: (form: CreateCustomerInput, editingId: null | string) => void
  open: boolean
  processing: boolean
  readOnly: boolean
  readOnlyMessage: string
  target: CustomerDto | null
}

export function CustomerDrawer({
  errors,
  onClose,
  onSubmit,
  open,
  processing,
  readOnly,
  readOnlyMessage,
  target,
}: CustomerDrawerProps) {
  const isEdit = target !== null
  const [form, setForm] = useState<CreateCustomerInput>(formFromTarget(target))

  function handleClose() {
    onClose()
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (readOnly) return
    onSubmit(form, target?.id ?? null)
  }

  return (
    <DrawerPanel
      description={
        isEdit
          ? 'Update contact details. Draft invoices show the new company name; issued invoices keep their original label.'
          : 'Add a contact that can be selected when creating an invoice.'
      }
      footer={
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            className="rounded-lg bg-surface-container-highest px-4 py-3 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-high"
            onClick={handleClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-lg px-4 py-3 text-sm font-medium text-on-primary milled-steel-gradient transition-all hover:opacity-95 disabled:opacity-60"
            disabled={processing || readOnly}
            form="customer-form"
            type="submit"
          >
            {processing ? 'Saving…' : isEdit ? 'Update' : 'Save'}
          </button>
        </div>
      }
      icon={isEdit ? 'edit' : 'person_add'}
      onClose={handleClose}
      open={open}
      title={target ? `Edit ${target.company}` : 'Create customer'}
    >
      {readOnly ? <ErrorBanner message={readOnlyMessage} /> : null}

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
            disabled={readOnly}
            id="customer-company"
            onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
            required
            type="text"
            value={form.company}
          />
          {errors.company ? (
            <p className="mt-2 text-sm font-medium text-error">{errors.company}</p>
          ) : null}
        </div>

        <div className="sm:col-span-2">
          <label
            className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant"
            htmlFor="customer-address"
          >
            Address
          </label>
          <textarea
            className="w-full rounded-xl border border-outline-variant/35 bg-white px-3 py-3 text-sm text-on-surface outline-hidden transition-colors focus:border-primary"
            disabled={readOnly}
            id="customer-address"
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            required
            rows={2}
            value={form.address}
          />
          {errors.address ? (
            <p className="mt-2 text-sm font-medium text-error">{errors.address}</p>
          ) : null}
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
            disabled={readOnly}
            id="customer-name"
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            type="text"
            value={form.name}
          />
          {errors.name ? (
            <p className="mt-2 text-sm font-medium text-error">{errors.name}</p>
          ) : null}
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
            disabled={readOnly}
            id="customer-phone"
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            type="tel"
            value={form.phone ?? ''}
          />
          {errors.phone ? (
            <p className="mt-2 text-sm font-medium text-error">{errors.phone}</p>
          ) : null}
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
            disabled={readOnly}
            id="customer-email"
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            type="email"
            value={form.email ?? ''}
          />
          {errors.email ? (
            <p className="mt-2 text-sm font-medium text-error">{errors.email}</p>
          ) : null}
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
            disabled={readOnly}
            id="customer-note"
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            rows={3}
            value={form.note ?? ''}
          />
          {errors.note ? (
            <p className="mt-2 text-sm font-medium text-error">{errors.note}</p>
          ) : null}
        </div>
      </form>
    </DrawerPanel>
  )
}

function formFromTarget(target: CustomerDto | null): CreateCustomerInput {
  if (!target) return EMPTY_FORM
  return {
    address: target.address,
    company: target.company,
    email: target.email,
    name: target.name,
    note: target.note ?? '',
    phone: target.phone,
  }
}
