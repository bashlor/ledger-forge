import { AppIcon } from '~/components/app_icon'

interface ActiveSearchFilterProps {
  className?: string
  label?: string
  onClear: () => void
  query: string
}

export function ActiveSearchFilter({
  className,
  label = 'Active search',
  onClear,
  query,
}: ActiveSearchFilterProps) {
  const trimmedQuery = query.trim()

  if (!trimmedQuery) {
    return null
  }

  return (
    <div
      className={[
        'inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-950 ring-1 ring-inset ring-amber-900/8',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="inline-flex items-center gap-1.5">
        <AppIcon className="text-amber-700" name="tune" size={14} />
        <span>{label}</span>
      </span>
      <span className="max-w-[18rem] truncate font-medium" title={trimmedQuery}>
        {trimmedQuery}
      </span>
      <button
        className="inline-flex items-center gap-1 rounded-full border border-amber-200/80 bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-amber-900 transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/25"
        onClick={onClear}
        type="button"
      >
        <AppIcon name="close" size={12} />
        Clear search
      </button>
    </div>
  )
}
