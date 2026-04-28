import type { ReactNode } from 'react'

import { Link } from '@adonisjs/inertia/react'

import { Caption, Eyebrow } from './ui'

export type PageHeaderBreadcrumbSegment = {
  href?: string
  label: string
}

interface PageHeaderProps {
  actions?: ReactNode
  breadcrumb?: PageHeaderBreadcrumbSegment[]
  className?: string
  description: string
  eyebrow?: string
  title: string
}

export function PageHeader({
  actions,
  breadcrumb,
  className,
  description,
  eyebrow,
  title,
}: PageHeaderProps) {
  return (
    <div className={`flex flex-col gap-3 sm:gap-3.5 ${className ?? ''}`.trim()}>
      {breadcrumb?.length ? (
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            {breadcrumb.map((segment, index) => {
              const isLast = index === breadcrumb.length - 1

              return (
                <li
                  className="flex min-w-0 items-center gap-x-1.5"
                  key={`${segment.label}-${index}`}
                >
                  {index > 0 ? (
                    <span aria-hidden className="font-normal text-on-surface-variant/45">
                      /
                    </span>
                  ) : null}
                  {segment.href && !isLast ? (
                    <Link
                      className="truncate text-on-surface-variant transition-colors duration-200 hover:text-primary"
                      href={segment.href}
                    >
                      {segment.label}
                    </Link>
                  ) : (
                    <span className={`truncate ${isLast ? 'text-slate-700' : 'text-slate-500'}`}>
                      {segment.label}
                    </span>
                  )}
                </li>
              )
            })}
          </ol>
        </nav>
      ) : null}
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
        <div className="min-w-0 flex-1 space-y-2 sm:max-w-3xl">
          <h1 className="font-headline text-[1.65rem] font-bold leading-[1.12] tracking-tight text-slate-950 sm:text-3xl sm:leading-tight">
            {title}
          </h1>
          <Caption className="max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-[15px]">
            {description}
          </Caption>
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:pt-1">{actions}</div>
        ) : null}
      </div>
    </div>
  )
}
