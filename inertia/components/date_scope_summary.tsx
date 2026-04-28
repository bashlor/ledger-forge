import { useDateScope } from '~/components/date_scope_provider'
import { formatDateScopeCaption } from '~/lib/date_scope'

export function DateScopeSummary({ className = '' }: { className?: string }) {
  const { scope } = useDateScope()

  return (
    <div
      className={`inline-flex max-w-full flex-wrap items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-[13px] shadow-sm ${className}`}
    >
      <span className="font-semibold text-on-surface">{scope.label}</span>
      <span aria-hidden="true" className="h-1 w-1 rounded-full bg-on-surface-variant/40" />
      <span className="text-on-surface-variant">{formatDateScopeCaption(scope)}</span>
    </div>
  )
}
