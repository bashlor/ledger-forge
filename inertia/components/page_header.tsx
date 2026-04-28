import type { ReactNode } from 'react'

import { Caption, Eyebrow } from './ui'

interface PageHeaderProps {
  actions?: ReactNode
  className?: string
  description: string
  eyebrow?: string
  title: string
}

export function PageHeader({ actions, className, description, eyebrow, title }: PageHeaderProps) {
  return (
    <div className={`flex flex-col gap-2.5 ${className ?? ''}`.trim()}>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1 space-y-1.5 sm:max-w-3xl">
          <h1 className="font-headline text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
            {title}
          </h1>
          <Caption className="max-w-2xl text-sm leading-relaxed text-on-surface-variant sm:text-[15px]">
            {description}
          </Caption>
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2 sm:pt-0.5">{actions}</div>
        ) : null}
      </div>
    </div>
  )
}
