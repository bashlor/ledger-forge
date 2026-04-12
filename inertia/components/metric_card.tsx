import { AppIcon } from './app_icon'

interface MetricCardProps {
  icon: string
  label: string
  tone?: MetricTone
  value: string
}

type MetricTone = 'danger' | 'default' | 'featured' | 'success'

const TONE_ACCENT: Record<MetricTone, string> = {
  danger: 'border-error/20',
  default: 'border-primary/20',
  featured: 'border-on-primary/25',
  success: 'border-tertiary/20',
}

const TONE_ICON: Record<MetricTone, string> = {
  danger: 'text-error/80',
  default: 'text-primary/80',
  featured: 'text-on-primary/90',
  success: 'text-tertiary/80',
}

const TONE_VALUE: Record<MetricTone, string> = {
  danger: 'text-on-surface',
  default: 'text-on-surface',
  featured: 'text-on-primary',
  success: 'text-on-surface',
}

export function MetricCard({ icon, label, tone = 'default', value }: MetricCardProps) {
  const isFeatured = tone === 'featured'

  return (
    <article
      className={`flex min-h-[120px] flex-col justify-between rounded-xl border-b-2 bg-surface-container-lowest p-5 shadow-ambient-tight ${
        isFeatured ? 'milled-steel-gradient border-on-primary/20' : TONE_ACCENT[tone]
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={`max-w-[78%] tabular-nums text-[2rem] font-headline font-extrabold leading-none tracking-tight sm:text-4xl ${TONE_VALUE[tone]}`}
        >
          {value}
        </p>
        <span className={`shrink-0 opacity-90 ${TONE_ICON[tone]}`}>
          <AppIcon name={icon} size={20} />
        </span>
      </div>
      <p
        className={`mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] ${
          isFeatured ? 'text-primary-container/85' : 'text-on-surface-variant'
        }`}
      >
        {label}
      </p>
    </article>
  )
}
