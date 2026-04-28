import type { ReactNode } from 'react'

interface AuthCalloutProps {
  children: ReactNode
  icon: ReactNode
}

export function AuthCallout({ children, icon }: AuthCalloutProps) {
  return (
    <div className="flex gap-3 rounded-xl border border-primary/10 bg-primary-container/20 px-3 py-2.5">
      <span className="mt-0.5 shrink-0 text-primary/80">{icon}</span>
      <p className="text-xs font-medium leading-relaxed text-on-surface-variant">{children}</p>
    </div>
  )
}
