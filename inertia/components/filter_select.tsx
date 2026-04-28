import type { ChangeEvent, ChangeEventHandler } from 'react'

import { useId, useRef, useState } from 'react'

import { AppIcon } from '~/components/app_icon'
import { useCloseOnOutsideAndEscape } from '~/hooks/use_close_on_outside_and_escape'

interface FilterSelectOption {
  label: string
  value: string
}

interface FilterSelectProps {
  'aria-label': string
  className?: string
  onChange: ChangeEventHandler<HTMLSelectElement>
  options: readonly FilterSelectOption[]
  value: string
}

export function FilterSelect({
  'aria-label': ariaLabel,
  className,
  onChange,
  options,
  value,
}: FilterSelectProps) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()
  const wrapClass = `relative w-full sm:w-auto sm:min-w-[11rem] ${className ?? ''}`.trim()
  const selected = options.find((option) => option.value === value)

  useCloseOnOutsideAndEscape(open, setOpen, wrapRef)

  function selectValue(next: string) {
    onChange({ target: { value: next } } as ChangeEvent<HTMLSelectElement>)
    setOpen(false)
  }

  return (
    <div className={wrapClass} ref={wrapRef}>
      <button
        aria-controls={open ? listboxId : undefined}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className={`inline-flex h-9 w-full min-w-0 items-center justify-center gap-1.5 rounded-lg border border-slate-200/95 bg-white px-2 py-1 text-center text-xs font-semibold leading-snug text-slate-900 shadow-sm shadow-slate-900/[0.04] outline-hidden ring-1 ring-slate-900/[0.03] transition-colors duration-150 ease-out hover:border-slate-300/90 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 ${
          open ? 'border-primary ring-2 ring-primary/25' : ''
        }`}
        onClick={() => setOpen((state) => !state)}
        type="button"
      >
        <span className="min-w-0 flex-1 truncate text-center">{selected?.label ?? value}</span>
        <AppIcon
          aria-hidden
          className={`shrink-0 text-slate-500 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          name="expand_more"
          size={16}
        />
      </button>

      {open ? (
        <div
          className="absolute left-1/2 top-full z-[100] mt-2 min-w-full max-w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-xl border border-border-default bg-white py-1 shadow-lg shadow-slate-900/12 ring-1 ring-slate-900/[0.05]"
          id={listboxId}
          role="listbox"
        >
          {options.map((option) => {
            const isSelected = option.value === value
            return (
              <button
                aria-selected={isSelected}
                className={`relative flex w-full min-w-0 items-center rounded-lg py-1.5 pr-3 pl-9 text-left text-xs font-medium text-slate-800 outline-hidden transition-colors duration-150 hover:bg-slate-50 ${
                  isSelected ? 'bg-slate-50/80' : ''
                }`}
                key={option.value}
                onClick={() => selectValue(option.value)}
                role="option"
                type="button"
              >
                <span className="absolute left-2.5 flex h-4 w-4 shrink-0 items-center justify-center">
                  {isSelected ? (
                    <AppIcon className="text-primary" name="task_alt" size={14} />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1 truncate pr-1">{option.label}</span>
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
