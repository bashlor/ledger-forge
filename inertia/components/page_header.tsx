import type { ReactNode } from 'react'

interface PageHeaderProps {
  actions?: ReactNode
  className?: string
  description: string
  eyebrow?: string
  title: string
}

export function PageHeader({ actions, description, eyebrow, title }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-1">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">
          {title}
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-on-surface-variant">{description}</p>
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">{actions}</div>
      ) : null}
    </div>
  )
}
