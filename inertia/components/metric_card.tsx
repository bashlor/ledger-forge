import { AppIcon } from './app_icon'

export type MetricCardTrend = {
  label?: string
  percent: number
}

interface MetricCardProps {
  caption?: string
  footnote?: string
  icon: string
  label: string
  tone?: MetricTone
  trend?: MetricCardTrend | null
  value: string
}

type MetricTone = 'danger' | 'default' | 'featured' | 'success'

const ICON_SURFACE: Record<MetricTone, string> = {
  danger: 'bg-red-50 text-red-600 ring-red-100/80',
  default: 'bg-primary-container/90 text-primary ring-primary/10',
  featured: 'bg-white/15 text-white ring-white/20',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-100/80',
}

const VALUE_CLASS: Record<MetricTone, string> = {
  danger: 'text-on-surface',
  default: 'text-on-surface',
  featured: 'text-white',
  success: 'text-on-surface',
}

const CAPTION_CLASS: Record<MetricTone, string> = {
  danger: 'text-on-surface-variant',
  default: 'text-on-surface-variant',
  featured: 'text-white/75',
  success: 'text-on-surface-variant',
}

const FOOTNOTE_CLASS: Record<MetricTone, string> = {
  danger: 'text-on-surface-variant/90',
  default: 'text-on-surface-variant/90',
  featured: 'text-white/70',
  success: 'text-on-surface-variant/90',
}

function formatTrendPercent(value: number): string {
  const rounded = Math.round(value * 10) / 10
  const prefix = rounded > 0 ? '+' : ''
  return `${prefix}${rounded}%`
}

export function MetricCard({
  caption,
  footnote,
  icon,
  label,
  tone = 'default',
  trend,
  value,
}: MetricCardProps) {
  const isFeatured = tone === 'featured'
  const trendPositive = trend !== null && trend !== undefined && trend.percent > 0
  const trendNegative = trend !== null && trend !== undefined && trend.percent < 0

  return (
    <article
      className={`group flex min-h-[148px] flex-col rounded-xl border bg-surface-container-lowest p-5 shadow-sm ring-1 ring-slate-900/[0.02] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md ${
        isFeatured
          ? 'border-transparent bg-primary shadow-md shadow-primary/15 ring-transparent'
          : 'border-outline-variant/90 hover:border-outline-variant'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p
          className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${CAPTION_CLASS[tone]}`}
        >
          {label}
        </p>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 transition-transform duration-200 ease-out group-hover:scale-[1.03] ${ICON_SURFACE[tone]}`}
        >
          <AppIcon name={icon} size={18} />
        </div>
      </div>

      <p
        className={`mt-3 text-[1.35rem] font-bold tabular-nums leading-none tracking-tight sm:text-[1.65rem] ${VALUE_CLASS[tone]}`}
      >
        {value}
      </p>

      {caption ? (
        <p className={`mt-2 text-xs leading-snug ${CAPTION_CLASS[tone]}`}>{caption}</p>
      ) : null}

      <div className="mt-auto space-y-1.5 pt-4">
        {trend !== null && trend !== undefined ? (
          <p
            className={`flex items-center gap-1.5 text-xs font-semibold tabular-nums ${
              trendPositive
                ? 'text-emerald-600'
                : trendNegative
                  ? 'text-rose-600'
                  : 'text-on-surface-variant'
            }`}
          >
            {trendPositive ? (
              <AppIcon className="shrink-0 -rotate-90" name="chevron_right" size={16} />
            ) : trendNegative ? (
              <AppIcon className="shrink-0 rotate-90" name="chevron_right" size={16} />
            ) : (
              <span aria-hidden className="inline-block w-3 text-center text-[10px] font-bold">
                —
              </span>
            )}
            <span>{formatTrendPercent(trend.percent)}</span>
            {trend.label ? (
              <span className="font-normal text-on-surface-variant">{trend.label}</span>
            ) : null}
          </p>
        ) : null}
        {footnote ? (
          <p className={`text-[11px] leading-snug ${FOOTNOTE_CLASS[tone]}`}>{footnote}</p>
        ) : null}
      </div>
    </article>
  )
}
