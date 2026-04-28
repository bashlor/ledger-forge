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

  function handleMonthChange(value: string) {
    if (!value) return
    const [y, m] = value.split('-').map(Number)
    if (!y || !m) return
    jumpToMonth(y, m - 1)
    const next = createMonthDateScope(y, m - 1)
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
          className="min-w-0 px-2 py-1.5 text-center transition-colors duration-200 hover:bg-surface-container-low/80"
          onClick={togglePanel}
          type="button"
        >
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
          className="absolute left-1/2 top-full z-50 mt-1.5 w-[min(calc(100vw-1.5rem),18.5rem)] -translate-x-1/2 rounded-lg border border-outline-variant bg-surface-container-lowest py-3 shadow-lg shadow-slate-900/10"
          id={panelId}
          role="dialog"
        >
          <div className="border-b border-outline-variant px-3 pb-3">
            <label className="grid gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                Month
              </span>
              <input
                className="h-9 w-full rounded-md border border-outline-variant bg-surface-container-lowest px-2.5 text-sm text-on-surface outline-hidden focus:border-primary focus:ring-1 focus:ring-primary/20"
                onChange={(event) => handleMonthChange(event.target.value)}
                type="month"
                value={monthInputValue}
              />
            </label>
          </div>

          <form className="px-3 pt-3" onSubmit={handleSubmit}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
              Custom range
            </p>
            <div className="mt-2 grid gap-3">
              <label className="grid gap-1">
                <span className="text-xs text-on-surface-variant">Start</span>
                <input
                  className="h-9 w-full rounded-md border border-outline-variant bg-surface-container-lowest px-2.5 text-sm text-on-surface outline-hidden focus:border-primary focus:ring-1 focus:ring-primary/20"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, startDate: event.target.value }))
                  }
                  type="date"
                  value={form.startDate}
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs text-on-surface-variant">End</span>
                <input
                  className="h-9 w-full rounded-md border border-outline-variant bg-surface-container-lowest px-2.5 text-sm text-on-surface outline-hidden focus:border-primary focus:ring-1 focus:ring-primary/20"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, endDate: event.target.value }))
                  }
                  type="date"
                  value={form.endDate}
                />
              </label>
            </div>

            {invalidRange ? (
              <p className="mt-2 text-xs text-error">La date de fin doit être après le début.</p>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                className="rounded-md border border-outline-variant bg-surface-container-low px-3 py-1.5 text-xs font-medium text-on-surface transition-colors hover:bg-surface-container-high"
                onClick={() => setPanelOpen(false)}
                type="button"
              >
                Close
              </button>
              <button
                className="rounded-md border border-outline-variant bg-surface-container-low px-3 py-1.5 text-xs font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-50"
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
                className="ml-auto rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary shadow-sm shadow-primary/15 transition-colors hover:bg-primary-dim disabled:cursor-not-allowed disabled:opacity-60"
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
