interface StatusBadgeProps {
  status: string
}

const BADGE_STYLES: Record<string, string> = {
  booked: 'bg-surface-container-high text-on-surface-variant',
  confirmed: 'bg-tertiary-container text-on-tertiary-container',
  draft: 'bg-surface-container-high text-on-surface-variant',
  good_payer: 'bg-tertiary-container text-on-tertiary-container',
  issued: 'bg-primary-container text-on-primary-container',
  no_activity: 'bg-surface-container-high text-on-surface-variant',
  overdue: 'bg-error-container text-on-error-container',
  paid: 'bg-tertiary-container text-on-tertiary-container',
  pending: 'bg-surface-container-high text-on-surface-variant',
  settled: 'bg-tertiary-container text-on-tertiary-container',
}

const BADGE_LABELS: Record<string, string> = {
  booked: 'Booked',
  confirmed: 'Confirmed',
  draft: 'Draft',
  good_payer: 'Good payer',
  issued: 'Issued',
  no_activity: 'No activity',
  overdue: 'Overdue',
  paid: 'Paid',
  pending: 'Pending',
  settled: 'Settled',
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const key = status.toLowerCase()
  const label = BADGE_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1)
  const styles = BADGE_STYLES[key] ?? 'bg-surface-container-high text-on-surface-variant'

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${styles}`}
    >
      {label}
    </span>
  )
}
