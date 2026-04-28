import type { ReactNode } from 'react'

import * as SelectPrimitive from '@radix-ui/react-select'

import { AppIcon } from '~/components/app_icon'

export interface SelectOption {
  disabled?: boolean
  label: string
  /** Shown in the closed trigger; defaults to `label`. */
  triggerLabel?: string
  value: string
}

const triggerBaseClass =
  'inline-flex h-10 min-w-0 shrink-0 items-center justify-between gap-2 rounded-xl border border-slate-200/95 bg-white px-3 py-2 text-left text-sm font-medium text-slate-900 shadow-sm shadow-slate-900/[0.04] outline-hidden ring-1 ring-slate-900/[0.03] transition-[border-color,box-shadow,transform] duration-150 ease-out hover:border-slate-300/90 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[placeholder]:text-slate-400 data-[state=open]:border-primary data-[state=open]:ring-2 data-[state=open]:ring-primary/25 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25'

const triggerCompactModifier =
  'h-9 gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold leading-snug shadow-sm ring-1 ring-slate-900/[0.03]'

/** Matches `inputClass()` / app form controls. */
const triggerSurfaceClass =
  'inline-flex h-10 min-w-0 w-full shrink-0 items-center justify-between gap-2 rounded-xl border border-border-default bg-white px-3 py-2 text-left text-sm font-medium text-on-surface shadow-sm shadow-slate-900/[0.04] outline-hidden ring-1 ring-slate-900/[0.05] transition-colors hover:border-slate-400 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-60 data-[placeholder]:text-outline/50 data-[state=open]:border-primary data-[state=open]:ring-2 data-[state=open]:ring-primary/25 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25'

const triggerSurfaceCompactModifier =
  'h-9 rounded-lg px-2 py-1 text-xs font-semibold leading-snug shadow-sm ring-1 ring-slate-900/[0.05]'

/** Popper positioning avoids misalignment inside flex toolbars (vs default item-aligned). */
const contentBaseClass =
  'box-border min-w-[var(--radix-select-trigger-width)] max-h-[min(22rem,70dvh)] max-w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-border-default bg-white py-1 shadow-lg shadow-slate-900/12 ring-1 ring-slate-900/[0.05] transition-[opacity,transform] duration-150 ease-out data-[side=bottom]:origin-top data-[side=top]:origin-bottom data-[state=closed]:scale-[0.98] data-[state=closed]:opacity-0 data-[state=open]:scale-100 data-[state=open]:opacity-100 z-[100]'

const itemBaseClass =
  'relative flex min-w-0 cursor-pointer select-none items-center rounded-lg py-2 pr-3 pl-9 text-sm font-medium text-slate-800 outline-hidden data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[highlighted]:bg-slate-50 data-[state=checked]:bg-slate-50/80'

const itemCompactClass = 'py-1.5 text-xs'

export interface SelectProps {
  'aria-label'?: string
  contentClassName?: string
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

export function Select({
  'aria-label': ariaLabel,
  contentClassName,
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
  const valueDisplay = selected ? (selected.triggerLabel ?? selected.label) : undefined
  const triggerToneClass = tone === 'surface' ? triggerSurfaceClass : triggerBaseClass
  const compactClass = size === 'compact' ? (tone === 'surface' ? triggerSurfaceCompactModifier : triggerCompactModifier) : ''
  const iconSize = size === 'compact' ? 16 : 18
  const itemSizeClass = size === 'compact' ? itemCompactClass : ''

  const trigger = (
    <SelectPrimitive.Trigger
      aria-label={ariaLabel}
      className={`${triggerToneClass} ${compactClass} ${triggerClassName ?? ''}`.trim()}
      disabled={disabled}
      id={id}
      type="button"
    >
      <SelectPrimitive.Value className="min-w-0 flex-1 truncate text-left" placeholder={placeholder}>
        {valueDisplay}
      </SelectPrimitive.Value>
      <SelectPrimitive.Icon aria-hidden className="shrink-0 text-slate-500">
        <AppIcon name="expand_more" size={iconSize} />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )

  return (
    <SelectPrimitive.Root
      disabled={disabled}
      form={form}
      name={name}
      onValueChange={onValueChange}
      required={required}
      value={value}
    >
      {label ? (
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
            {label}
          </span>
          {trigger}
        </div>
      ) : (
        trigger
      )}

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          align="center"
          avoidCollisions
          className={`${contentBaseClass} ${contentClassName ?? ''}`.trim()}
          collisionPadding={8}
          position="popper"
          side="bottom"
          sideOffset={8}
        >
          <SelectPrimitive.Viewport className="min-w-0 p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                className={`${itemBaseClass} ${itemSizeClass}`.trim()}
                disabled={option.disabled}
                key={option.value}
                textValue={option.label}
                value={option.value}
              >
                <span className="absolute left-2.5 flex h-4 w-4 shrink-0 items-center justify-center">
                  <SelectPrimitive.ItemIndicator>
                    <AppIcon className="text-primary" name="task_alt" size={size === 'compact' ? 14 : 16} />
                  </SelectPrimitive.ItemIndicator>
                </span>
                <SelectPrimitive.ItemText className="min-w-0 flex-1 truncate pr-1">
                  {option.label}
                </SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
