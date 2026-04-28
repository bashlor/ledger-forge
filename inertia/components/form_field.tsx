import { FormLabel } from './ui'

interface FormFieldProps {
  autoComplete?: string
  /** When `value` is omitted, the field is uncontrolled and uses this initial value. */
  defaultValue?: number | string
  disabled?: boolean
  error?: string
  id: string
  label: string
  labelAction?: React.ReactNode
  min?: string
  name?: string
  onChange?: (value: string) => void
  placeholder?: string
  required?: boolean
  rows?: number
  step?: string
  type?: string
  value?: number | string
  variant?: 'bordered' | 'ghost'
}

const INPUT_BORDERED =
  'w-full rounded-xl border border-border-default bg-white px-3 py-3 text-sm text-on-surface outline-hidden transition-colors focus:border-primary disabled:cursor-not-allowed disabled:opacity-60'

const INPUT_GHOST =
  'w-full border-0 bg-surface-container-lowest py-3 pl-0 pr-0 font-medium text-on-surface shadow-none outline-hidden ring-0 transition-all placeholder:text-outline/40 focus:border-primary focus:ring-0 ghost-border'

export function FormField({
  autoComplete,
  defaultValue,
  disabled,
  error,
  id,
  label,
  labelAction,
  min,
  name,
  onChange,
  placeholder,
  required,
  rows,
  step,
  type = 'text',
  value,
  variant = 'bordered',
}: FormFieldProps) {
  const inputClassName = variant === 'ghost' ? INPUT_GHOST : INPUT_BORDERED
  const fieldName = name ?? id
  const isGhost = variant === 'ghost'
  const isControlled = value !== undefined

  const sharedProps = {
    autoComplete,
    className: inputClassName,
    'data-invalid': error ? 'true' : undefined,
    disabled,
    id,
    name: fieldName,
    onChange: onChange
      ? (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value)
      : undefined,
    placeholder,
    required,
    ...(isControlled ? { value } : defaultValue !== undefined ? { defaultValue } : {}),
  }

  return (
    <div className="space-y-2">
      {labelAction ? (
        <div className="flex items-end justify-between gap-2">
          <FormLabel htmlFor={id}>{label}</FormLabel>
          {labelAction}
        </div>
      ) : (
        <FormLabel htmlFor={id}>{label}</FormLabel>
      )}
      {isGhost ? (
        <div className="group relative">
          {rows ? (
            <textarea {...sharedProps} rows={rows} />
          ) : (
            <input {...sharedProps} min={min} step={step} type={type} />
          )}
          <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-primary transition-all duration-300 group-focus-within:w-full" />
        </div>
      ) : rows ? (
        <textarea {...sharedProps} rows={rows} />
      ) : (
        <input {...sharedProps} min={min} step={step} type={type} />
      )}
      {error ? <p className="text-sm font-medium text-error">{error}</p> : null}
    </div>
  )
}
