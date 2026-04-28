import type { ReactNode } from 'react'

interface ButtonProps {
  children: ReactNode
  className?: string
  disabled?: boolean
  form?: string
  fullWidth?: boolean
  onClick?: () => void
  title?: string
  type?: 'button' | 'submit'
}

export function GhostButton({
  children,
  className,
  disabled,
  form,
  fullWidth,
  onClick,
  title,
  type = 'button',
}: ButtonProps) {
  return (
    <button
      className={`rounded-xl border border-transparent bg-transparent px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
        fullWidth ? 'w-full' : ''
      } ${className ?? ''}`.trim()}
      disabled={disabled}
      form={form}
      onClick={onClick}
      title={title}
      type={type}
    >
      {children}
    </button>
  )
}

export function PrimaryButton({
  children,
  className,
  disabled,
  form,
  fullWidth,
  onClick,
  title,
  type = 'button',
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary shadow-sm shadow-primary/20 transition-colors duration-150 hover:bg-primary-dim focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
        fullWidth ? 'w-full' : ''
      } ${className ?? ''}`.trim()}
      disabled={disabled}
      form={form}
      onClick={onClick}
      title={title}
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
  title,
  type = 'button',
}: ButtonProps) {
  return (
    <button
      className={`rounded-xl border border-border-default bg-surface-container-lowest px-4 py-2.5 text-sm font-semibold text-on-surface shadow-sm transition-colors duration-150 hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
        fullWidth ? 'w-full' : ''
      } ${className ?? ''}`.trim()}
      disabled={disabled}
      form={form}
      onClick={onClick}
      title={title}
      type={type}
    >
      {children}
    </button>
  )
}
