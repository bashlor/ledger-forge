import { useEffect, useState } from 'react'

import type { CreateCustomerInput, CustomerDto } from '~/lib/types'
import type { FormErrors } from '~/types'

import { GhostButton, PrimaryButton, SecondaryButton } from '~/components/button'
import { DrawerPanel } from '~/components/drawer_panel'
import { ErrorBanner } from '~/components/error_banner'
import { FormField } from '~/components/form_field'
import { Eyebrow } from '~/components/ui'

const EMPTY_FORM: CreateCustomerInput = {
  address: '',
  company: '',
  email: '',
  name: '',
  note: '',
  phone: '',
}

export type CustomerDrawerMode = 'create' | 'edit' | 'view'

interface CustomerDrawerProps {
  errors: FormErrors
  mode: CustomerDrawerMode
  onClose: () => void
  onRequestEditMode?: () => void
  onSubmit: (form: CreateCustomerInput, editingId: null | string) => void
  open: boolean
  processing: boolean
  readOnly: boolean
  readOnlyMessage: string
  target: CustomerDto | null
}

export function CustomerDrawer({
  errors,
  mode,
  onClose,
  onRequestEditMode,
  onSubmit,
  open,
  processing,
  readOnly,
  readOnlyMessage,
  target,
}: CustomerDrawerProps) {
  const isView = mode === 'view'
  const [form, setForm] = useState<CreateCustomerInput>(() => formFromTarget(target))

  useEffect(() => {
    setForm(formFromTarget(target))
  }, [target])

  function handleClose() {
    onClose()
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (readOnly || isView) return
    onSubmit(form, target?.id ?? null)
  }

  const fieldsLocked = readOnly || isView

  const title =
    mode === 'create' ? 'Create customer' : mode === 'view' ? (target?.company ?? 'Customer') : `Edit ${target?.company ?? ''}`

  const description =
    mode === 'create'
      ? 'Add a contact that can be selected when creating an invoice.'
      : mode === 'view'
        ? 'Read-only summary. Use Edit to change details.'
        : 'Update contact details. Draft invoices show the new company name; issued invoices keep their original label.'

  const icon =
    mode === 'view' ? 'monitoring' : mode === 'edit' ? 'edit' : 'person_add'

  const footer =
    isView ? (
      <div className="flex flex-wrap items-center justify-end gap-3">
        <GhostButton className="py-2.5" onClick={handleClose} type="button">
          Close
        </GhostButton>
        {!readOnly && onRequestEditMode ? (
          <SecondaryButton className="py-2.5" onClick={onRequestEditMode} type="button">
            Edit customer
          </SecondaryButton>
        ) : null}
      </div>
    ) : (
      <div className="flex flex-wrap items-center justify-end gap-3">
        <GhostButton className="py-2.5" onClick={handleClose} type="button">
          Cancel
        </GhostButton>
        <PrimaryButton
          className="py-2.5"
          disabled={processing || readOnly}
          form="customer-form"
          type="submit"
        >
          {processing ? 'Saving…' : target ? 'Update' : 'Save'}
        </PrimaryButton>
      </div>
    )

  return (
    <DrawerPanel
      description={description}
      footer={footer}
      icon={icon}
      maxWidthClass="max-w-[520px]"
      onClose={handleClose}
      open={open}
      title={title}
    >
      {readOnly ? <ErrorBanner message={readOnlyMessage} /> : null}

      <form className="space-y-6" id="customer-form" onSubmit={handleSubmit}>
        <section className="space-y-3">
          <Eyebrow className="text-slate-500">Company info</Eyebrow>
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            <div className="sm:col-span-2">
              <FormField
                disabled={fieldsLocked}
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
                disabled={fieldsLocked}
                error={errors.address}
                id="customer-address"
                label="Address"
                onChange={(value) => setForm((f) => ({ ...f, address: value }))}
                required
                rows={2}
                value={form.address}
              />
            </div>
          </div>
        </section>

        <section className="space-y-3 border-t border-slate-100 pt-5">
          <Eyebrow className="text-slate-500">Contact info</Eyebrow>
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            <FormField
              disabled={fieldsLocked}
              error={errors.name}
              id="customer-name"
              label="Contact"
              onChange={(value) => setForm((f) => ({ ...f, name: value }))}
              required
              value={form.name}
            />
            <FormField
              disabled={fieldsLocked}
              error={errors.phone}
              id="customer-phone"
              label="Phone"
              onChange={(value) => setForm((f) => ({ ...f, phone: value }))}
              type="tel"
              value={form.phone ?? ''}
            />
            <div className="sm:col-span-2">
              <FormField
                disabled={fieldsLocked}
                error={errors.email}
                id="customer-email"
                label="Email"
                onChange={(value) => setForm((f) => ({ ...f, email: value }))}
                type="email"
                value={form.email ?? ''}
              />
            </div>
          </div>
        </section>

        <section className="space-y-3 border-t border-slate-100 pt-5">
          <Eyebrow className="text-slate-500">Internal note</Eyebrow>
          <FormField
            disabled={fieldsLocked}
            error={errors.note}
            id="customer-note"
            label="Note"
            onChange={(value) => setForm((f) => ({ ...f, note: value }))}
            rows={3}
            value={form.note ?? ''}
          />
        </section>
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
