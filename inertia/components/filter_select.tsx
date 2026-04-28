import type { ChangeEventHandler } from 'react'

import { AppIcon } from './app_icon'

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

export function FilterSelect({ 'aria-label': ariaLabel, className, onChange, options, value }: FilterSelectProps) {
  const wrapClass = `relative w-full sm:w-auto sm:min-w-[11rem] ${className ?? ''}`.trim()

  return (
    <div className={wrapClass}>
      <select
        aria-label={ariaLabel}
        className="h-10 w-full cursor-pointer appearance-none rounded-xl border border-slate-200/95 bg-white px-10 py-2 text-center text-sm font-medium text-slate-800 shadow-sm shadow-slate-900/[0.04] outline-hidden ring-1 ring-slate-900/[0.03] transition-[border-color,box-shadow] duration-150 ease-out hover:border-slate-300/90 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25"
        onChange={onChange}
        value={value}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <span
        aria-hidden
        className="pointer-events-none absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center text-slate-500"
      >
        <AppIcon name="expand_more" size={18} />
      </span>
    </div>
  )
}
