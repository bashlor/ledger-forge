interface StatusBadgeProps {
  status: string
}

const BADGE_STYLES: Record<string, string> = {
  booked:
    'border border-slate-200/80 bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-900/5',
  confirmed:
    'border border-emerald-200/80 bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-900/5',
  draft:
    'border border-indigo-200/80 bg-indigo-50 text-indigo-800 ring-1 ring-inset ring-indigo-900/5',
  good_payer:
    'border border-emerald-200/80 bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-900/5',
  issued:
    'border border-violet-200/80 bg-violet-50 text-violet-800 ring-1 ring-inset ring-violet-900/5',
  no_activity:
    'border border-slate-200/80 bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-900/5',
  overdue:
    'border border-red-200/80 bg-red-50 text-red-800 ring-1 ring-inset ring-red-900/5',
  paid: 'border border-emerald-200/80 bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-900/5',
  pending:
    'border border-amber-200/80 bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-900/5',
  settled:
    'border border-emerald-200/80 bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-900/5',
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
  const styles =
    BADGE_STYLES[key] ??
    'border border-slate-200/80 bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-900/5'

  return (
    <span
      className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-semibold tracking-wide ${styles}`}
    >
      {label}
    </span>
  )
}
