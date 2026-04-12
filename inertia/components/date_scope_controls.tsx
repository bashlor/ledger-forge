import type { FormEvent } from 'react'

import { useMemo, useState } from 'react'

import type { DateRange } from '~/lib/types'

import { AppIcon } from '~/components/app_icon'
import { useDateScope } from '~/components/date_scope_provider'
import { Modal } from '~/components/modal'
import { createCurrentMonthDateScope, isValidDateRange } from '~/lib/date_scope'
import { formatTopbarDate } from '~/lib/format'

export function DateScopeControls() {
  const { resetToCurrentMonth, scope, setCustomRange, shiftBackward, shiftForward } = useDateScope()
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<DateRange>({ endDate: scope.endDate, startDate: scope.startDate })

  function openModal() {
    setForm({ endDate: scope.endDate, startDate: scope.startDate })
    setModalOpen(true)
  }

  const invalidRange = useMemo(() => !isValidDateRange(form), [form])
  const isCurrentMonth =
    scope.startDate === createCurrentMonthDateScope().startDate &&
    scope.endDate === createCurrentMonthDateScope().endDate &&
    scope.mode === 'month'

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (invalidRange) return

    setCustomRange(form)
    setModalOpen(false)
  }

  return (
    <>
      <div className="flex items-center gap-1 rounded-2xl border border-outline-variant/12 bg-white/80 p-1 shadow-sm backdrop-blur-md">
        <button
          aria-label="Previous period"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-on-surface-variant transition-colors hover:border-outline-variant/15 hover:bg-surface-container-low hover:text-on-surface"
          onClick={shiftBackward}
          type="button"
        >
          <AppIcon name="chevron_left" size={16} />
        </button>

        <div className="min-w-[9.5rem] rounded-xl bg-surface-container-low/80 px-3 py-1.5 text-center sm:min-w-[10.5rem]">
          <p className="font-headline text-[13px] font-extrabold text-on-surface sm:text-sm">
            {scope.label}
          </p>
          <p className="mt-0.5 text-[10px] text-on-surface-variant">
            {formatTopbarDate(scope.startDate)} to {formatTopbarDate(scope.endDate)}
          </p>
        </div>

        <button
          aria-label="Next period"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-on-surface-variant transition-colors hover:border-outline-variant/15 hover:bg-surface-container-low hover:text-on-surface"
          onClick={shiftForward}
          type="button"
        >
          <AppIcon name="chevron_right" size={16} />
        </button>

        <div aria-hidden="true" className="hidden h-7 w-px bg-outline-variant/15 sm:block" />

        <button
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-outline-variant/15 bg-surface-container-low/80 px-3 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
          onClick={openModal}
          type="button"
        >
          <AppIcon name="date_range" size={16} />
          <span className="hidden sm:inline">Filter</span>
        </button>
      </div>

      <Modal
        description="Choose a global period for overview widgets and list components. This version only wires the UI layer."
        footer={
          <>
            <button
              className="rounded-xl border border-outline-variant/20 px-4 py-2.5 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
              onClick={() => setModalOpen(false)}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-xl border border-outline-variant/20 px-4 py-2.5 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isCurrentMonth}
              onClick={() => {
                resetToCurrentMonth()
                setModalOpen(false)
              }}
              type="button"
            >
              Reset to current month
            </button>
            <button
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-on-primary milled-steel-gradient transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={invalidRange}
              form="date-scope-form"
              type="submit"
            >
              Apply range
            </button>
          </>
        }
        onClose={() => setModalOpen(false)}
        open={modalOpen}
        size="md"
        title="Global date scope"
      >
        <form className="grid gap-4 sm:grid-cols-2" id="date-scope-form" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm text-on-surface-variant">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">
              Start date
            </span>
            <input
              className="w-full rounded-xl border border-outline-variant/35 bg-white px-3 py-3 text-sm text-on-surface outline-hidden transition-colors focus:border-primary"
              onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
              type="date"
              value={form.startDate}
            />
          </label>
          <label className="grid gap-2 text-sm text-on-surface-variant">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">
              End date
            </span>
            <input
              className="w-full rounded-xl border border-outline-variant/35 bg-white px-3 py-3 text-sm text-on-surface outline-hidden transition-colors focus:border-primary"
              onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))}
              type="date"
              value={form.endDate}
            />
          </label>

          <div className="sm:col-span-2">
            <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-low px-4 py-3">
              <p className="text-sm font-semibold text-on-surface">Active scope</p>
              <p className="mt-1 text-sm text-on-surface-variant">{scope.label}</p>
              <p className="mt-2 text-sm text-on-surface-variant">
                {invalidRange
                  ? 'Choose an end date that is on or after the start date.'
                  : `This range will be reflected by the topbar controls immediately.`}
              </p>
            </div>
          </div>
        </form>
      </Modal>
    </>
  )
}
