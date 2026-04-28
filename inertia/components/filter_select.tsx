import type { ChangeEvent, ChangeEventHandler } from 'react'

import { Select } from '~/components/ui'

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
      <Select
        aria-label={ariaLabel}
        onValueChange={(next) =>
          onChange({ target: { value: next } } as ChangeEvent<HTMLSelectElement>)
        }
        options={options}
        size="compact"
        triggerClassName="w-full max-w-[11rem] justify-center text-center sm:max-w-none"
        value={value}
      />
    </div>
  )
}
