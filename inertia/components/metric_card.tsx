import { AppIcon } from './app_icon'

interface MetricCardProps {
  icon: string
  label: string
  tone?: MetricTone
  value: string
}

type MetricTone = 'danger' | 'default' | 'featured' | 'success'

const BADGE_SURFACE: Record<MetricTone, string> = {
  danger: 'bg-red-50 text-red-600',
  default: 'bg-primary-container text-primary',
  featured: 'bg-white/20 text-white',
  success: 'bg-emerald-50 text-emerald-700',
}

const VALUE_CLASS: Record<MetricTone, string> = {
  danger: 'text-on-surface',
  default: 'text-on-surface',
  featured: 'text-white',
  success: 'text-on-surface',
}

const LABEL_CLASS: Record<MetricTone, string> = {
  danger: 'text-on-surface-variant',
  default: 'text-on-surface-variant',
  featured: 'text-white/85',
  success: 'text-on-surface-variant',
}

export function MetricCard({ icon, label, tone = 'default', value }: MetricCardProps) {
  const isFeatured = tone === 'featured'

  return (
    <article
      className={`group flex min-h-[118px] flex-col rounded-xl border bg-surface-container-lowest p-5 shadow-sm transition-shadow duration-200 hover:shadow-md ${
        isFeatured
          ? 'border-transparent bg-primary shadow-md shadow-primary/20'
          : 'border-outline-variant'
      }`}
    >
      <div className="flex min-h-[3.25rem] items-start justify-between gap-3">
        <p
          className={`min-w-0 flex-1 text-2xl font-bold tabular-nums leading-none tracking-tight sm:text-[1.75rem] ${VALUE_CLASS[tone]}`}
        >
          {value}
        </p>
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-[1.02] ${BADGE_SURFACE[tone]}`}
        >
          <AppIcon name={icon} size={18} />
        </div>
      </div>
      <p
        className={`mt-auto pt-4 text-[11px] font-semibold uppercase tracking-[0.12em] ${LABEL_CLASS[tone]}`}
      >
        {label}
      </p>
    </article>
  )
}
