import type { ReactNode } from 'react'

interface PageHeaderProps {
  actions?: ReactNode
  className?: string
  description: string
  eyebrow?: string
  title: string
}

export function PageHeader({ actions, className, description, eyebrow, title }: PageHeaderProps) {
  return (
    <div
      className={`flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between ${className ?? ''}`.trim()}
    >
      <div className="space-y-2">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface sm:text-4xl">
          {title}
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-on-surface-variant sm:text-base">{description}</p>
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-3 self-stretch sm:self-start lg:self-auto">
          {actions}
        </div>
      ) : null}
    </div>
  )
}
