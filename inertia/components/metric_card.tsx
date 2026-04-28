import { AppIcon } from './app_icon'

export type MetricCardTrend = {
  label?: string
  percent: number
}

interface MetricCardProps {
  caption?: string
  icon: string
  label: string
  tone?: MetricTone
  trend?: MetricCardTrend | null
  value: string
}

type MetricTone = 'danger' | 'default' | 'featured' | 'success'

const ICON_SURFACE: Record<MetricTone, string> = {
  danger: 'bg-red-50 text-red-600 ring-1 ring-red-100/90',
  default: 'bg-primary-container/95 text-primary ring-1 ring-primary/12',
  featured: 'bg-white/15 text-white ring-1 ring-white/25',
  success: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100/90',
}

const VALUE_CLASS: Record<MetricTone, string> = {
  danger: 'text-slate-950',
  default: 'text-slate-950',
  featured: 'text-white',
  success: 'text-slate-950',
}

const LABEL_CLASS: Record<MetricTone, string> = {
  danger: 'text-slate-500',
  default: 'text-slate-500',
  featured: 'text-white/80',
  success: 'text-slate-500',
}

const CAPTION_CLASS: Record<MetricTone, string> = {
  danger: 'text-slate-600',
  default: 'text-slate-600',
  featured: 'text-white/75',
  success: 'text-slate-600',
}

export function MetricCard({
  caption,
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
      className={`group flex min-h-0 flex-col rounded-xl border bg-white p-4 shadow-md shadow-slate-900/[0.05] ring-1 ring-slate-900/[0.04] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/[0.07] sm:p-[1.125rem] ${
        isFeatured
          ? 'border-transparent bg-primary shadow-lg shadow-primary/20 ring-transparent'
          : 'border-slate-200/95 hover:border-slate-300/90'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${LABEL_CLASS[tone]}`}>
          {label}
        </p>
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 ease-out group-hover:scale-[1.04] ${ICON_SURFACE[tone]}`}
        >
          <AppIcon name={icon} size={17} />
        </div>
      </div>

      <p
        className={`mt-2.5 text-[1.4rem] font-bold tabular-nums leading-none tracking-tight sm:text-[1.55rem] ${VALUE_CLASS[tone]}`}
      >
        {value}
      </p>

      {caption ? (
        <p
          className={`mt-2 line-clamp-2 text-[11px] leading-snug sm:text-xs ${CAPTION_CLASS[tone]}`}
        >
          {caption}
        </p>
      ) : null}

      {trend !== null && trend !== undefined ? (
        <p
          className={`mt-3 flex items-center gap-1.5 text-[11px] font-semibold tabular-nums sm:text-xs ${
            trendPositive ? 'text-emerald-600' : trendNegative ? 'text-rose-600' : 'text-slate-500'
          }`}
        >
          {trendPositive ? (
            <AppIcon className="shrink-0 -rotate-90" name="chevron_right" size={14} />
          ) : trendNegative ? (
            <AppIcon className="shrink-0 rotate-90" name="chevron_right" size={14} />
          ) : (
            <span aria-hidden className="inline-block w-3 text-center text-[10px] font-bold">
              —
            </span>
          )}
          <span>{formatTrendPercent(trend.percent)}</span>
          {trend.label ? <span className="font-normal text-slate-500">{trend.label}</span> : null}
        </p>
      ) : null}
    </article>
  )
}

function formatTrendPercent(value: number): string {
  const rounded = Math.round(value * 10) / 10
  const prefix = rounded > 0 ? '+' : ''
  return `${prefix}${rounded}%`
}
