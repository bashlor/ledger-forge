import type { ReactNode } from 'react'

import { AppIcon } from './app_icon'

interface EmptyStateProps {
  action?: ReactNode
  className?: string
  icon?: string
  message: string
  title?: string
}

export function EmptyState({ action, className, icon, message, title }: EmptyStateProps) {
  if (title || icon || action) {
    return (
      <div
        className={`flex flex-col items-center justify-center px-5 py-8 text-center sm:px-6 sm:py-9 ${className ?? ''}`.trim()}
      >
        {icon ? (
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-container/95 text-primary shadow-sm ring-1 ring-primary/12">
            <AppIcon name={icon} size={24} />
          </div>
        ) : null}
        {title ? (
          <h3 className="max-w-sm text-base font-semibold tracking-tight text-slate-950 sm:text-lg">
            {title}
          </h3>
        ) : null}
        <p
          className={`max-w-sm text-sm leading-relaxed text-slate-600 ${title ? 'mt-1.5' : ''}`}
        >
          {message}
        </p>
        {action ? <div className="mt-5 w-full max-w-[14rem] sm:w-auto">{action}</div> : null}
      </div>
    )
  }

  return (
    <div className="px-4 py-8">
      <div className="rounded-lg border border-dashed border-outline-variant/35 bg-surface-container-low px-4 py-5 text-sm text-on-surface-variant">
        {message}
      </div>
    </div>
  )
}
