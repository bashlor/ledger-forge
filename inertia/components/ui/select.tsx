import type { ReactNode } from 'react'

import SelectBase, {
  type ClassNamesConfig,
  type DropdownIndicatorProps,
  type FormatOptionLabelMeta,
  components as reactSelectComponents,
  type StylesConfig,
} from 'react-select'

import { AppIcon } from '~/components/app_icon'

export interface SelectOption {
  disabled?: boolean
  label: string
  /** Shown in the closed trigger; defaults to `label`. */
  triggerLabel?: string
  value: string
}

export interface SelectProps {
  align?: 'center' | 'end' | 'start'
  'aria-label'?: string
  className?: string
  disabled?: boolean
  form?: string
  id?: string
  label?: ReactNode
  name?: string
  onValueChange: (value: string) => void
  options: readonly SelectOption[]
  placeholder?: string
  required?: boolean
  /** Tighter control for toolbars and pagination. */
  size?: 'compact' | 'default'
  /** `surface` aligns with app form fields (`inputClass`); default matches filter/datatable controls. */
  tone?: 'slate' | 'surface'
  triggerClassName?: string
  value: string
}

const portalStyles: StylesConfig<SelectOption, false> = {
  menuPortal: (base) => ({
    ...base,
    zIndex: 80,
  }),
}

export function Select({
  align = 'center',
  'aria-label': ariaLabel,
  className,
  disabled,
  form,
  id,
  label,
  name,
  onValueChange,
  options,
  placeholder,
  required,
  size = 'default',
  tone = 'slate',
  triggerClassName,
  value,
}: SelectProps) {
  const selected = options.find((option) => option.value === value)
  const selectValue = selected ?? (placeholder ? null : (options[0] ?? null))
  const instanceId = id ?? name ?? ariaLabel?.toLowerCase().replace(/\s+/g, '-')
  const menuPortalTarget = typeof document === 'undefined' ? null : document.body

  const rootClassName = [
    label ? 'min-w-0' : tone === 'surface' ? 'w-full min-w-0' : 'inline-block min-w-0',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const formatOptionLabel = (option: SelectOption, meta: FormatOptionLabelMeta<SelectOption>) =>
    meta.context === 'menu' ? option.label : (option.triggerLabel ?? option.label)

  const classNames: ClassNamesConfig<SelectOption, false> = {
    container: () => 'min-w-0',
    control: ({ isDisabled, isFocused }) => {
      const base =
        tone === 'surface'
          ? `${label ? 'min-h-10 h-10 w-auto' : 'min-h-10 h-10 w-full'} min-w-0 rounded-xl border border-border-default bg-white px-3 text-sm text-on-surface shadow-sm outline-hidden ring-1 ring-slate-900/[0.05] transition-colors duration-150`
          : `${label ? 'min-h-10 w-auto' : 'min-h-10 w-full'} min-w-0 rounded-xl border border-slate-200/95 bg-white px-3 text-sm font-medium text-slate-900 shadow-sm shadow-slate-900/[0.04] outline-hidden ring-1 ring-slate-900/[0.03] transition-[border-color,box-shadow,transform] duration-150 ease-out`

      const focus =
        tone === 'surface'
          ? 'border-primary ring-2 ring-primary/20'
          : 'border-primary ring-2 ring-primary/25'

      const idle = tone === 'surface' ? 'hover:border-slate-400' : 'hover:border-slate-300/90'

      const disabledClass =
        tone === 'surface' ? 'cursor-not-allowed opacity-60' : 'cursor-not-allowed opacity-50'

      return [
        base,
        size === 'compact' ? 'h-9 min-h-9' : '',
        align === 'end' ? 'justify-end' : align === 'start' ? 'justify-start' : 'justify-center',
        triggerClassName ?? '',
        isFocused ? focus : idle,
        isDisabled ? disabledClass : 'cursor-pointer',
      ]
        .filter(Boolean)
        .join(' ')
    },
    dropdownIndicator: ({ isDisabled }) =>
      [
        'px-0 pr-0 pl-1.5 text-slate-500',
        size === 'compact' ? 'mr-0.5' : 'mr-0',
        isDisabled ? 'opacity-40' : '',
      ]
        .filter(Boolean)
        .join(' '),
    groupHeading: () =>
      'px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400',
    indicatorsContainer: () => 'shrink-0',
    indicatorSeparator: () => 'hidden',
    input: () => 'm-0 p-0 text-inherit',
    menu: () =>
      'mt-2 overflow-hidden rounded-xl border border-border-default bg-white shadow-lg shadow-slate-900/12 ring-1 ring-slate-900/[0.05]',
    menuList: () => 'max-h-60 py-1',
    noOptionsMessage: () => 'px-3 py-2 text-sm text-slate-500',
    option: ({ isDisabled, isFocused, isSelected }) => {
      const optionText = size === 'compact' ? 'text-xs font-medium' : 'text-sm font-medium'
      return [
        'cursor-pointer px-3 py-2 transition-colors duration-150',
        optionText,
        isDisabled ? 'cursor-not-allowed opacity-40' : 'text-slate-800',
        isSelected ? 'bg-slate-50 text-slate-900' : '',
        isFocused ? 'bg-slate-50' : '',
      ]
        .filter(Boolean)
        .join(' ')
    },
    placeholder: () =>
      ['m-0 truncate', tone === 'surface' ? 'text-on-surface-variant' : 'text-slate-400'].join(' '),
    singleValue: () =>
      [
        'm-0 min-w-0 truncate',
        tone === 'surface' ? 'text-on-surface' : 'text-slate-900',
        align === 'end' ? 'text-right' : align === 'start' ? 'text-left' : 'text-center',
      ].join(' '),
    valueContainer: () =>
      [
        'flex min-w-0 flex-1 items-center p-0',
        align === 'end' ? 'justify-end' : align === 'start' ? 'justify-start' : 'justify-center',
      ].join(' '),
  }

  return (
    <div className={rootClassName}>
      {label ? (
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
            {label}
          </span>
          <div className="inline-block min-w-0">
            <SelectBase
              aria-label={ariaLabel}
              classNames={classNames}
              components={{ DropdownIndicator, IndicatorSeparator: null }}
              form={form}
              formatOptionLabel={formatOptionLabel}
              inputId={id}
              instanceId={instanceId}
              isDisabled={disabled}
              isOptionDisabled={(option) => Boolean(option.disabled)}
              isSearchable={false}
              menuPlacement="auto"
              menuPortalTarget={menuPortalTarget}
              menuPosition="fixed"
              onChange={(next) => onValueChange(next?.value ?? '')}
              options={options}
              placeholder={placeholder}
              required={required}
              styles={portalStyles}
              unstyled
              value={selectValue}
            />
          </div>
        </div>
      ) : (
        <SelectBase
          aria-label={ariaLabel}
          classNames={classNames}
          components={{ DropdownIndicator, IndicatorSeparator: null }}
          form={form}
          formatOptionLabel={formatOptionLabel}
          inputId={id}
          instanceId={instanceId}
          isDisabled={disabled}
          isOptionDisabled={(option) => Boolean(option.disabled)}
          isSearchable={false}
          menuPlacement="auto"
          menuPortalTarget={menuPortalTarget}
          menuPosition="fixed"
          onChange={(next) => onValueChange(next?.value ?? '')}
          options={options}
          placeholder={placeholder}
          required={required}
          styles={portalStyles}
          unstyled
          value={selectValue}
        />
      )}
    </div>
  )
}

function DropdownIndicator(props: DropdownIndicatorProps<SelectOption, false>) {
  return (
    <reactSelectComponents.DropdownIndicator {...props}>
      <AppIcon name="expand_more" size={18} />
    </reactSelectComponents.DropdownIndicator>
  )
}
