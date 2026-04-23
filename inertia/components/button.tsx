import type { ReactNode } from 'react'

interface ButtonProps {
  children: ReactNode
  className?: string
  disabled?: boolean
  form?: string
  fullWidth?: boolean
  onClick?: () => void
  type?: 'button' | 'submit'
}

export function PrimaryButton({
  children,
  className,
  disabled,
  form,
  fullWidth,
  onClick,
  type = 'button',
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-on-primary shadow-sm milled-steel-gradient transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60 ${
        fullWidth ? 'w-full' : ''
      } ${className ?? ''}`.trim()}
      disabled={disabled}
      form={form}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  )
}

export function SecondaryButton({
  children,
  className,
  disabled,
  form,
  fullWidth,
  onClick,
  type = 'button',
}: ButtonProps) {
  return (
    <button
      className={`rounded-lg bg-surface-container-highest px-4 py-2.5 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-60 ${
        fullWidth ? 'w-full' : ''
      } ${className ?? ''}`.trim()}
      disabled={disabled}
      form={form}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  )
}
