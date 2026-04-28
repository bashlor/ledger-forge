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
        className={`flex flex-col items-center justify-center px-4 py-14 text-center sm:px-8 ${className ?? ''}`.trim()}
      >
        {icon ? (
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-container/90 text-primary shadow-sm ring-1 ring-primary/10">
            <AppIcon name={icon} size={26} />
          </div>
        ) : null}
        {title ? (
          <h3 className="max-w-md text-base font-semibold tracking-tight text-on-surface sm:text-lg">
            {title}
          </h3>
        ) : null}
        <p
          className={`max-w-md text-sm leading-relaxed text-on-surface-variant ${title ? 'mt-2' : ''}`}
        >
          {message}
        </p>
        {action ? <div className="mt-8 w-full max-w-xs sm:w-auto">{action}</div> : null}
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
