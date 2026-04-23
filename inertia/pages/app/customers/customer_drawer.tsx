import { useState } from 'react'

import type { CreateCustomerInput, CustomerDto } from '~/lib/types'
import type { FormErrors } from '~/types'

import { PrimaryButton, SecondaryButton } from '~/components/button'
import { DrawerPanel } from '~/components/drawer_panel'
import { ErrorBanner } from '~/components/error_banner'
import { FormField } from '~/components/form_field'

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
          <SecondaryButton className="py-3" onClick={handleClose}>
            Cancel
          </SecondaryButton>
          <PrimaryButton
            className="py-3"
            disabled={processing || readOnly}
            form="customer-form"
            type="submit"
          >
            {processing ? 'Saving…' : isEdit ? 'Update' : 'Save'}
          </PrimaryButton>
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
          <FormField
            disabled={readOnly}
            error={errors.company}
            id="customer-company"
            label="Company"
            onChange={(value) => setForm((f) => ({ ...f, company: value }))}
            required
            value={form.company}
          />
        </div>

        <div className="sm:col-span-2">
          <FormField
            disabled={readOnly}
            error={errors.address}
            id="customer-address"
            label="Address"
            onChange={(value) => setForm((f) => ({ ...f, address: value }))}
            required
            rows={2}
            value={form.address}
          />
        </div>

        <FormField
          disabled={readOnly}
          error={errors.name}
          id="customer-name"
          label="Contact"
          onChange={(value) => setForm((f) => ({ ...f, name: value }))}
          required
          value={form.name}
        />

        <FormField
          disabled={readOnly}
          error={errors.phone}
          id="customer-phone"
          label="Phone"
          onChange={(value) => setForm((f) => ({ ...f, phone: value }))}
          type="tel"
          value={form.phone ?? ''}
        />

        <div className="sm:col-span-2">
          <FormField
            disabled={readOnly}
            error={errors.email}
            id="customer-email"
            label="Email"
            onChange={(value) => setForm((f) => ({ ...f, email: value }))}
            type="email"
            value={form.email ?? ''}
          />
        </div>

        <div className="sm:col-span-2">
          <FormField
            disabled={readOnly}
            error={errors.note}
            id="customer-note"
            label="Note"
            onChange={(value) => setForm((f) => ({ ...f, note: value }))}
            rows={3}
            value={form.note ?? ''}
          />
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
