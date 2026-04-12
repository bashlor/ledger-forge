import { useDateScope } from '~/components/date_scope_provider'
import { formatDateScopeCaption } from '~/lib/date_scope'

export function DateScopeSummary({ className = '' }: { className?: string }) {
  const { scope } = useDateScope()

  return (
    <div
      className={`inline-flex flex-wrap items-center gap-2 rounded-2xl border border-outline-variant/15 bg-surface-container-low px-3 py-2 text-sm text-on-surface-variant ${className}`}
    >
      <span className="font-semibold text-on-surface">{scope.label}</span>
      <span aria-hidden="true" className="h-1 w-1 rounded-full bg-outline-variant/60" />
      <span>{formatDateScopeCaption(scope)}</span>
    </div>
  )
}
