import type { ReactNode } from 'react'

interface FormLabelProps extends TextProps {
  htmlFor: string
}

interface TextProps {
  children: ReactNode
  className?: string
}

export function Caption({ children, className }: TextProps) {
  return (
    <p className={`text-sm leading-5 text-on-surface-variant ${className ?? ''}`.trim()}>
      {children}
    </p>
  )
}

export function Eyebrow({ children, className }: TextProps) {
  return <p className={`eyebrow ${className ?? ''}`.trim()}>{children}</p>
}

export function FormLabel({ children, className, htmlFor }: FormLabelProps) {
  return (
    <label className={`form-label-caps ${className ?? ''}`.trim()} htmlFor={htmlFor}>
      {children}
    </label>
  )
}
