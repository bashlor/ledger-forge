import type { FormEvent } from 'react'

import { useMemo, useState } from 'react'

import type { DateRange } from '~/lib/types'

import { AppIcon } from '~/components/app_icon'
import { useDateScope } from '~/components/date_scope_provider'
import { Modal } from '~/components/modal'
import { createCurrentMonthDateScope, isValidDateRange } from '~/lib/date_scope'

export function DateScopeControls() {
  const { resetToCurrentMonth, scope, setCustomRange, shiftBackward, shiftForward } = useDateScope()
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<DateRange>({
    endDate: scope.endDate,
    startDate: scope.startDate,
  })

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
      <div className="flex items-center gap-1">
        <button
          aria-label="Previous period"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
          onClick={shiftBackward}
          type="button"
        >
          <AppIcon name="chevron_left" size={18} />
        </button>

        <button
          className="rounded-lg px-3 py-1.5 text-center transition-colors hover:bg-surface-container-low"
          onClick={openModal}
          type="button"
        >
          <p className="font-headline text-sm font-bold tabular-nums text-on-surface">
            {scope.label}
          </p>
        </button>

        <button
          aria-label="Next period"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
          onClick={shiftForward}
          type="button"
        >
          <AppIcon name="chevron_right" size={18} />
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
              onChange={(event) =>
                setForm((current) => ({ ...current, startDate: event.target.value }))
              }
              type="date"
              value={form.startDate}
            />
          </label>
          <label className="grid gap-2 text-sm text-on-surface-variant">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">End date</span>
            <input
              className="w-full rounded-xl border border-outline-variant/35 bg-white px-3 py-3 text-sm text-on-surface outline-hidden transition-colors focus:border-primary"
              onChange={(event) =>
                setForm((current) => ({ ...current, endDate: event.target.value }))
              }
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
