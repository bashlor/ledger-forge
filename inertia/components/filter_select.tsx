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

export function FilterSelect({
  'aria-label': ariaLabel,
  className,
  onChange,
  options,
  value,
}: FilterSelectProps) {
  return (
    <Select
      aria-label={ariaLabel}
      className={className}
      onValueChange={(next) =>
        onChange({ target: { value: next } } as ChangeEvent<HTMLSelectElement>)
      }
      options={options}
      size="compact"
      tone="slate"
      value={value}
    />
  )
}
