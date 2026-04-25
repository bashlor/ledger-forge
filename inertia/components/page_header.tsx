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
    <div
      className={`flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between ${className ?? ''}`.trim()}
    >
      <div className="space-y-2">
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <h1 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface sm:text-4xl">
          {title}
        </h1>
        <Caption className="max-w-2xl sm:text-base">{description}</Caption>
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-3 self-stretch sm:self-start lg:self-auto">
          {actions}
        </div>
      ) : null}
    </div>
  )
}
