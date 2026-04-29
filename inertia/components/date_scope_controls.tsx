import type { FormEvent } from 'react'

import { useId, useMemo, useRef, useState } from 'react'

import type { DateRange } from '~/lib/types'

import { AppIcon } from '~/components/app_icon'
import { useDateScope } from '~/components/date_scope_provider'
import { useCloseOnOutsideAndEscape } from '~/hooks/use_close_on_outside_and_escape'
import {
  createCurrentMonthDateScope,
  createMonthDateScope,
  isValidDateRange,
} from '~/lib/date_scope'

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

export function DateScopeControls() {
  const { jumpToMonth, resetToCurrentMonth, scope, setCustomRange, shiftBackward, shiftForward } =
    useDateScope()
  const [panelOpen, setPanelOpen] = useState(false)
  const [form, setForm] = useState<DateRange>({
    endDate: scope.endDate,
    startDate: scope.startDate,
  })
  const containerRef = useRef<HTMLDivElement>(null)
  const panelId = useId()

  useCloseOnOutsideAndEscape(panelOpen, setPanelOpen, containerRef)

  function openPanel() {
    setForm({ endDate: scope.endDate, startDate: scope.startDate })
    setPanelOpen(true)
  }

  function togglePanel() {
    if (panelOpen) {
      setPanelOpen(false)
    } else {
      openPanel()
    }
  }

  const invalidRange = useMemo(() => !isValidDateRange(form), [form])
  const isCurrentMonth =
    scope.startDate === createCurrentMonthDateScope().startDate &&
    scope.endDate === createCurrentMonthDateScope().endDate &&
    scope.mode === 'month'

  /** YYYY-MM for native month input */
  const monthInputValue = scope.startDate.slice(0, 7)
  const activeMonthDate = new Date(`${scope.startDate}T00:00:00.000Z`)
  const activeMonth = activeMonthDate.getUTCMonth()
  const activeYear = activeMonthDate.getUTCFullYear()

  function handleMonthChange(value: string) {
    if (!value) return
    const [y, m] = value.split('-').map(Number)
    if (!y || !m) return
    jumpToMonth(y, m - 1)
    const next = createMonthDateScope(y, m - 1)
    setForm({ endDate: next.endDate, startDate: next.startDate })
    setPanelOpen(false)
  }

  function handleYearChange(delta: -1 | 1) {
    const next = createMonthDateScope(activeYear + delta, activeMonth)
    jumpToMonth(activeYear + delta, activeMonth)
    setForm({ endDate: next.endDate, startDate: next.startDate })
  }

  function handleMonthSelect(monthIndex: number) {
    const next = createMonthDateScope(activeYear, monthIndex)
    jumpToMonth(activeYear, monthIndex)
    setForm({ endDate: next.endDate, startDate: next.startDate })
    setPanelOpen(false)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (invalidRange) return

    setCustomRange(form)
    setPanelOpen(false)
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex items-center gap-0">
        <button
          aria-label="Previous period"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-on-surface-variant transition-colors duration-200 hover:bg-surface-container-low hover:text-on-surface"
          onClick={shiftBackward}
          type="button"
        >
          <AppIcon name="chevron_left" size={18} />
        </button>

        <button
          aria-controls={panelId}
          aria-expanded={panelOpen}
          aria-haspopup="dialog"
          aria-label="Open date picker"
          className="inline-flex min-w-0 items-center gap-2 rounded-lg px-2.5 py-1.5 text-center transition-colors duration-200 hover:bg-surface-container-low/80"
          onClick={togglePanel}
          type="button"
        >
          <AppIcon className="shrink-0 text-primary" name="date_range" size={16} />
          <p className="truncate font-headline text-[13px] font-medium tabular-nums text-on-surface">
            {scope.label}
          </p>
        </button>

        <button
          aria-label="Next period"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-on-surface-variant transition-colors duration-200 hover:bg-surface-container-low hover:text-on-surface"
          onClick={shiftForward}
          type="button"
        >
          <AppIcon name="chevron_right" size={18} />
        </button>
      </div>

      {panelOpen ? (
        <div
          aria-label="Select period"
          aria-modal="false"
          className="absolute right-0 top-full z-50 mt-2 w-[min(calc(100vw-1.5rem),20rem)] rounded-2xl border border-slate-200/90 bg-white p-3 shadow-xl shadow-slate-900/12 ring-1 ring-slate-900/[0.04]"
          id={panelId}
          role="dialog"
        >
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
            <button
              aria-label="Previous year"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950"
              onClick={() => handleYearChange(-1)}
              type="button"
            >
              <AppIcon name="chevron_left" size={16} />
            </button>
            <div className="text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Select period
              </p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-950">
                {activeYear}
              </p>
            </div>
            <button
              aria-label="Next year"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950"
              onClick={() => handleYearChange(1)}
              type="button"
            >
              <AppIcon name="chevron_right" size={16} />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1.5 py-3">
            {MONTH_LABELS.map((label, monthIndex) => {
              const selected = scope.mode === 'month' && activeMonth === monthIndex
              return (
                <button
                  className={`rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors ${
                    selected
                      ? 'bg-primary text-on-primary shadow-sm shadow-primary/20'
                      : 'text-slate-600 hover:bg-primary-container hover:text-primary'
                  }`}
                  key={label}
                  onClick={() => handleMonthSelect(monthIndex)}
                  type="button"
                >
                  {label}
                </button>
              )
            })}
          </div>

          <div className="border-t border-slate-200/80 pt-3">
            <label className="grid gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Exact month
              </span>
              <input
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 shadow-sm outline-hidden ring-1 ring-slate-900/[0.03] transition-colors hover:border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
                onChange={(event) => handleMonthChange(event.target.value)}
                type="month"
                value={monthInputValue}
              />
            </label>
          </div>

          <form className="pt-3" onSubmit={handleSubmit}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Custom range
            </p>
            <div className="mt-2 grid gap-3">
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-600">Start</span>
                <input
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 shadow-sm outline-hidden ring-1 ring-slate-900/[0.03] transition-colors hover:border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, startDate: event.target.value }))
                  }
                  type="date"
                  value={form.startDate}
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-600">End</span>
                <input
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 shadow-sm outline-hidden ring-1 ring-slate-900/[0.03] transition-colors hover:border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, endDate: event.target.value }))
                  }
                  type="date"
                  value={form.endDate}
                />
              </label>
            </div>

            {invalidRange ? (
              <p className="mt-2 text-xs text-error">End date must be after start date.</p>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                onClick={() => setPanelOpen(false)}
                type="button"
              >
                Close
              </button>
              <button
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isCurrentMonth}
                onClick={() => {
                  resetToCurrentMonth()
                  setPanelOpen(false)
                }}
                type="button"
              >
                This month
              </button>
              <button
                className="ml-auto rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-on-primary shadow-sm shadow-primary/20 transition-colors hover:bg-primary-dim disabled:cursor-not-allowed disabled:opacity-60"
                disabled={invalidRange}
                type="submit"
              >
                Apply
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
