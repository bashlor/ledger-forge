import { useDateScope } from '~/components/date_scope_provider'
import { formatDateScopeCaption } from '~/lib/date_scope'

export function DateScopeSummary({ className = '' }: { className?: string }) {
  const { scope } = useDateScope()

  return (
    <div
      className={`inline-flex max-w-full flex-wrap items-center gap-2.5 rounded-xl border border-outline-variant/90 bg-surface-container-lowest px-3.5 py-2.5 text-[13px] shadow-sm ring-1 ring-slate-900/[0.02] ${className}`}
    >
      <span className="font-semibold text-on-surface">{scope.label}</span>
      <span aria-hidden="true" className="h-1 w-1 shrink-0 rounded-full bg-on-surface-variant/35" />
      <span className="text-on-surface-variant">{formatDateScopeCaption(scope)}</span>
    </div>
  )
}
