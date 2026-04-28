import type { SVGProps } from 'react'

interface AppIconProps {
  className?: string
  filled?: boolean
  name: string
  size?: number
}

type IconComponent = (props: SVGProps<SVGSVGElement>) => React.JSX.Element

const DEFAULT_SIZE = 24

const iconRegistry: Record<string, { filled?: IconComponent; outline: IconComponent }> = {
  account_balance: {
    filled: AccountBalanceFilledIcon,
    outline: AccountBalanceIcon,
  },
  account_balance_wallet: {
    filled: AccountBalanceWalletFilledIcon,
    outline: AccountBalanceWalletIcon,
  },
  add: {
    filled: PlusIcon,
    outline: PlusIcon,
  },
  business: {
    filled: BusinessFilledIcon,
    outline: BusinessIcon,
  },
  chevron_left: {
    filled: ChevronLeftIcon,
    outline: ChevronLeftIcon,
  },
  chevron_right: {
    filled: ChevronRightIcon,
    outline: ChevronRightIcon,
  },
  close: {
    filled: CloseIcon,
    outline: CloseIcon,
  },
  dashboard: {
    filled: DashboardFilledIcon,
    outline: DashboardIcon,
  },
  date_range: {
    filled: DateRangeFilledIcon,
    outline: DateRangeIcon,
  },
  expand_more: {
    filled: ChevronDownIcon,
    outline: ChevronDownIcon,
  },
  group: {
    filled: GroupFilledIcon,
    outline: GroupIcon,
  },
  logout: {
    filled: LogoutIcon,
    outline: LogoutIcon,
  },
  monitoring: {
    filled: MonitoringFilledIcon,
    outline: MonitoringIcon,
  },
  edit: {
    filled: EditFilledIcon,
    outline: EditIcon,
  },
  more_vert: {
    filled: MoreVertIcon,
    outline: MoreVertIcon,
  },
  notifications: {
    filled: NotificationsFilledIcon,
    outline: NotificationsIcon,
  },
  payments: {
    filled: PaymentsFilledIcon,
    outline: PaymentsIcon,
  },
  person_add: {
    filled: PersonAddFilledIcon,
    outline: PersonAddIcon,
  },
  receipt_long: {
    filled: ReceiptLongFilledIcon,
    outline: ReceiptLongIcon,
  },
  send: {
    filled: SendFilledIcon,
    outline: SendIcon,
  },
  search: {
    filled: SearchIcon,
    outline: SearchIcon,
  },
  settings: {
    filled: SettingsFilledIcon,
    outline: SettingsIcon,
  },
  shield_lock: {
    filled: ShieldLockFilledIcon,
    outline: ShieldLockIcon,
  },
  shopping_bag: {
    filled: ShoppingBagFilledIcon,
    outline: ShoppingBagIcon,
  },
  task_alt: {
    filled: TaskAltFilledIcon,
    outline: TaskAltIcon,
  },
  tune: {
    filled: TuneIcon,
    outline: TuneIcon,
  },
  verified_user: {
    filled: VerifiedUserFilledIcon,
    outline: VerifiedUserIcon,
  },
}

export function AppIcon({
  className = '',
  filled = false,
  name,
  size = DEFAULT_SIZE,
}: AppIconProps) {
  const entry = iconRegistry[name]

  if (!entry) {
    return null
  }

  const Icon = filled && entry.filled ? entry.filled : entry.outline

  return (
    <Icon
      aria-hidden="true"
      className={className || undefined}
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
      width={size}
    />
  )
}

function AccountBalanceFilledIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="currentColor" stroke="none">
      <path d="M12 3.6 2.4 8.1a1 1 0 0 0 .42 1.9h18.36a1 1 0 0 0 .42-1.9L12 3.6ZM4 11.5h2V18H4v-6.5Zm4.5 0h2V18h-2v-6.5Zm4.5 0h2V18h-2v-6.5Zm4.5 0h2V18h-2v-6.5ZM2.5 19.5h19a1 1 0 1 1 0 2h-19a1 1 0 1 1 0-2Z" />
    </svg>
  )
}

function AccountBalanceIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props}>
      <path d="M3 10.5h18" />
      <path d="M5 10.5V18" />
      <path d="M9.5 10.5V18" />
      <path d="M14.5 10.5V18" />
      <path d="M19 10.5V18" />
      <path d="M2.5 20h19" />
      <path d="M12 4 3 8.5v1h18v-1L12 4Z" />
    </svg>
  )
}

function AccountBalanceWalletFilledIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="currentColor" stroke="none">
      <path d="M6.5 4A3.5 3.5 0 0 0 3 7.5v9A3.5 3.5 0 0 0 6.5 20h11a3.5 3.5 0 0 0 3.5-3.5V11A3.5 3.5 0 0 0 17.5 7.5H5V7.4A1.5 1.5 0 0 1 6.5 6h10a1 1 0 1 0 0-2h-10Zm9 8.25a1.25 1.25 0 1 0 0 2.5h3a1 1 0 1 0 0-2h-3.25Z" />
    </svg>
  )
}

function AccountBalanceWalletIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props}>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h10A2.5 2.5 0 0 1 19 7.5v1H6.5A2.5 2.5 0 0 0 4 11v-3.5Z" />
      <path d="M4 11a2.5 2.5 0 0 1 2.5-2.5h11A2.5 2.5 0 0 1 20 11v6A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5V11Z" />
      <path d="M15.5 13.5h4" />
      <circle cx="15.5" cy="13.5" fill="currentColor" r=".5" stroke="none" />
    </svg>
  )
}

function BusinessFilledIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="currentColor" stroke="none">
      <path d="M4.5 21.25V8.9L12 5.2l7.5 3.7v12.35H21a.75.75 0 0 1 0 1.5H3a.75.75 0 0 1 0-1.5h1.5Zm6-11.5v9.5h3v-9.5H10.5Z" />
    </svg>
  )
}

function BusinessIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props}>
      <path d="M3 21h18" />
      <path d="M5 21V8.5L12 5l7 3.5V21" />
      <path d="M9 21V10.5" />
      <path d="M12 21V10.5" />
      <path d="M15 21V10.5" />
    </svg>
  )
}

function ChevronDownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

function ChevronLeftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

function ChevronRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props}>
      <path d="M6 6 18 18" />
      <path d="M18 6 6 18" />
    </svg>
  )
}

function DashboardFilledIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="currentColor" stroke="none">
      <rect height="7" rx="1.5" width="7" x="4" y="4" />
      <rect height="10" rx="1.5" width="7" x="13" y="4" />
      <rect height="7" rx="1.5" width="7" x="13" y="16" />
      <rect height="10" rx="1.5" width="7" x="4" y="13" />
    </svg>
  )
}

function DashboardIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props}>
      <rect height="7" rx="1.5" width="7" x="4" y="4" />
      <rect height="10" rx="1.5" width="7" x="13" y="4" />
      <rect height="7" rx="1.5" width="7" x="13" y="16" />
      <rect height="10" rx="1.5" width="7" x="4" y="13" />
    </svg>
  )
}

function DateRangeFilledIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="currentColor" stroke="none">
      <path d="M7 2.75a.75.75 0 0 1 .75.75V5h8.5V3.5a.75.75 0 0 1 1.5 0V5h.75A2.5 2.5 0 0 1 21 7.5v10A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-10A2.5 2.5 0 0 1 5.5 5h.75V3.5A.75.75 0 0 1 7 2.75Zm10.5 6.5h-13v8.25c0 .55.45 1 1 1h13c.55 0 1-.45 1-1V9.25Z" />
    </svg>
  )
}

function DateRangeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props}>
      <rect height="15" rx="2.5" width="18" x="3" y="5.5" />
      <path d="M7 3.5v4" />
      <path d="M17 3.5v4" />
      <path d="M3 9.5h18" />
    </svg>
  )
}

function GroupFilledIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="currentColor" stroke="none">
      <path d="M9 5.25A3.75 3.75 0 1 0 9 12.75 3.75 3.75 0 0 0 9 5.25Zm8 1.75a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM9 14.5c-3.45 0-6.25 2.8-6.25 6.25 0 .69.56 1.25 1.25 1.25h10.1c.69 0 1.25-.56 1.25-1.25C15.35 17.3 12.45 14.5 9 14.5Zm8 1.5c-1.59 0-3.04.59-4.14 1.56a7.68 7.68 0 0 1 1.8 3.94c.06.28.3.5.6.5H20a1 1 0 0 0 1-1c0-2.76-1.96-5-4-5Z" />
    </svg>
  )
}

function GroupIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props}>
      <circle cx="9" cy="9" r="3" />
      <circle cx="17" cy="10" r="2.5" />
      <path d="M4.5 18a4.5 4.5 0 0 1 9 0" />
      <path d="M13 18a4 4 0 0 1 7 0" />
    </svg>
  )
}

function LogoutIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props}>
      <path d="M14 7V5.5A2.5 2.5 0 0 0 11.5 3h-4A2.5 2.5 0 0 0 5 5.5v13A2.5 2.5 0 0 0 7.5 21h4a2.5 2.5 0 0 0 2.5-2.5V17" />
      <path d="M10 12h10" />
      <path d="m17 8 4 4-4 4" />
    </svg>
  )
}

function MonitoringFilledIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="currentColor" stroke="none">
      <rect height="2" rx="1" width="16" x="4" y="19" />
      <rect height="7" rx="1" width="3" x="5" y="9" />
      <rect height="11" rx="1" width="3" x="10.5" y="5" />
      <rect height="4" rx="1" width="3" x="16" y="12" />
    </svg>
  )
}

function MonitoringIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props}>
      <path d="M4 19h16" />
      <path d="M6 16V9" />
      <path d="M12 16V5" />
      <path d="M18 16v-4" />
    </svg>
  )
}

function EditFilledIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="currentColor" stroke="none">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Zm14.71-9.04a1 1 0 0 0 0-1.41L15.37 2.5a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.87Z" />
    </svg>
  )
}

function EditIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z" />
    </svg>
  )
}

function MoreVertIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="currentColor" stroke="none">
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="19" r="1.5" />
    </svg>
  )
}

function NotificationsFilledIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="currentColor" stroke="none">
      <path d="M12 4a5.25 5.25 0 0 0-5.25 5.25v3.18l-1.56 2.12A1.25 1.25 0 0 0 6.2 16.5h11.6a1.25 1.25 0 0 0 1.01-1.95l-1.56-2.12V9.25A5.25 5.25 0 0 0 12 4Zm-2 13.25a2 2 0 1 0 4 0h-4Z" />
    </svg>
  )
}

function NotificationsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props}>
      <path d="M15 17H5.5a1 1 0 0 1-.8-1.6l1.1-1.5V11a6.2 6.2 0 1 1 12.4 0v2.9l1.1 1.5a1 1 0 0 1-.8 1.6H15Z" />
      <path d="M10 18a2 2 0 0 0 4 0" />
    </svg>
  )
}

function PaymentsFilledIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="currentColor" stroke="none">
      <path d="M5.5 4A2.5 2.5 0 0 0 3 6.5v11A2.5 2.5 0 0 0 5.5 20h13a2.5 2.5 0 0 0 2.5-2.5v-11A2.5 2.5 0 0 0 18.5 4h-13Zm6.75 3c1.42 0 2.58.97 2.9 2.28h1.1a.75.75 0 0 1 0 1.5h-1.04a3.06 3.06 0 0 1-2.2 2.16l-.76.2c-.54.14-.93.62-.93 1.18 0 .68.57 1.25 1.25 1.25h.26c.64 0 1.18-.48 1.24-1.11a.75.75 0 1 1 1.5.14A2.76 2.76 0 0 1 13 17.03V18a.75.75 0 0 1-1.5 0v-.92a2.76 2.76 0 0 1-2.68-2.75c0-1.25.84-2.35 2.05-2.67l.76-.2c.58-.15 1-.67 1-1.27 0-.72-.58-1.3-1.3-1.3h-.14c-.68 0-1.24.52-1.3 1.18a.75.75 0 1 1-1.5-.14A2.77 2.77 0 0 1 11.5 7.05V6a.75.75 0 0 1 1.5 0v1Z" />
    </svg>
  )
}

function PaymentsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props}>
      <rect height="15" rx="2.5" width="18" x="3" y="4.5" />
      <path d="M12 7v10" />
      <path d="M14.5 9.5c-.4-.8-1.2-1.3-2.3-1.3-1.5 0-2.5.8-2.5 2s.8 1.8 2.1 2.1l1 .2c1.1.3 1.7.7 1.7 1.6 0 1.1-.9 1.9-2.4 1.9-1.2 0-2.1-.5-2.6-1.5" />
    </svg>
  )
}

function PersonAddFilledIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="currentColor" stroke="none">
      <path d="M9 5.25A3.75 3.75 0 1 0 9 12.75 3.75 3.75 0 0 0 9 5.25Zm8.75 1a.75.75 0 0 1 .75.75V9h2a.75.75 0 0 1 0 1.5h-2v2a.75.75 0 0 1-1.5 0v-2h-2a.75.75 0 0 1 0-1.5h2V7a.75.75 0 0 1 .75-.75ZM9 14.5c-3.45 0-6.25 2.8-6.25 6.25 0 .69.56 1.25 1.25 1.25h10.02c.69 0 1.25-.56 1.25-1.25C15.27 17.3 12.45 14.5 9 14.5Z" />
    </svg>
  )
}

function PersonAddIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props}>
      <circle cx="9" cy="9" r="3" />
      <path d="M4.5 18a4.5 4.5 0 0 1 9 0" />
      <path d="M17.5 7v6" />
      <path d="M14.5 10h6" />
    </svg>
  )
}

function PlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  )
}

function ReceiptLongFilledIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="currentColor" stroke="none">
      <path d="M7 3h10a2 2 0 0 1 2 2v15.1a.9.9 0 0 1-1.54.64L16 19.29l-1.46 1.46a.9.9 0 0 1-1.27 0L11.8 19.3l-1.46 1.46a.9.9 0 0 1-1.27 0L7.6 19.3l-1.46 1.46A.9.9 0 0 1 4.6 20.1V5a2 2 0 0 1 2-2Zm1.5 4a.75.75 0 0 0 0 1.5h7a.75.75 0 0 0 0-1.5h-7Zm0 4a.75.75 0 0 0 0 1.5h7a.75.75 0 0 0 0-1.5h-7Zm0 4a.75.75 0 0 0 0 1.5h4a.75.75 0 0 0 0-1.5h-4Z" />
    </svg>
  )
}

function ReceiptLongIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props}>
      <path d="M7 3.5h10A1.5 1.5 0 0 1 18.5 5v14.3L16 17l-2 2-2-2-2 2-2-2-2 2V5A1.5 1.5 0 0 1 7 3.5Z" />
      <path d="M8.5 7.5h7" />
      <path d="M8.5 11.5h7" />
      <path d="M8.5 15.5h4" />
    </svg>
  )
}

function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props}>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-3-3" />
    </svg>
  )
}

function SendFilledIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="currentColor" stroke="none">
      <path d="M3.45 11.37 19.9 4.45a.7.7 0 0 1 .94.86l-3.1 11.17a.72.72 0 0 1-1.14.38l-4.02-3.08-3.05 3.1a.72.72 0 0 1-1.23-.5V12.7L3.33 12.3a.7.7 0 0 1 .12-.92Zm3.9-.06 3.87.32 4.96-4.63-6.13 3.68a.75.75 0 0 0-.36.58l-.28 3.88 1.8-1.82a.75.75 0 0 1 .98-.08l3.4 2.6 2.3-8.28-10.54 4.44Z" />
    </svg>
  )
}

function SendIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props}>
      <path d="M20.5 4.5 3.5 11.5l6 1 1 6 10-14Z" />
      <path d="m9.5 12.5 7-6" />
    </svg>
  )
}

function SettingsFilledIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="currentColor" stroke="none">
      <path d="m19.14 12.94.01-.94-.01-.94 1.62-1.26a.77.77 0 0 0 .19-.99l-1.53-2.65a.78.78 0 0 0-.95-.34l-1.91.77a7.03 7.03 0 0 0-1.63-.95l-.29-2.03A.77.77 0 0 0 13.88 3h-3.06a.77.77 0 0 0-.76.64l-.29 2.03c-.58.22-1.12.54-1.62.95l-1.92-.77a.78.78 0 0 0-.95.34L3.75 8.84a.77.77 0 0 0 .19.99l1.62 1.26-.01.91.01.97-1.62 1.26a.77.77 0 0 0-.19.99l1.53 2.65c.2.35.62.49.99.34l1.88-.77c.5.41 1.04.74 1.62.96l.29 2.03c.06.38.38.66.76.66h3.06c.38 0 .7-.28.76-.66l.29-2.03c.58-.22 1.12-.55 1.63-.96l1.91.77c.37.15.79.01.99-.34l1.53-2.65a.77.77 0 0 0-.19-.99l-1.62-1.26ZM12.35 15.5A3.5 3.5 0 1 1 12.35 8.5a3.5 3.5 0 0 1 0 7Z" />
    </svg>
  )
}

function SettingsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props}>
      <path d="m19.4 15-1.2-.7c.1-.4.1-.8.1-1.3s0-.9-.1-1.3l1.2-.7-1.6-2.8-1.3.5c-.6-.5-1.2-.8-1.9-1l-.2-1.4h-3.2l-.2 1.4c-.7.2-1.3.5-1.9 1l-1.3-.5-1.6 2.8 1.2.7c-.1.4-.1.8-.1 1.3s0 .9.1 1.3l-1.2.7 1.6 2.8 1.3-.5c.6.5 1.2.8 1.9 1l.2 1.4h3.2l.2-1.4c.7-.2 1.3-.5 1.9-1l1.3.5 1.6-2.8Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function ShieldLockFilledIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="currentColor" stroke="none">
      <path d="M12 3.3 5 5.9v4.8c0 4.26 2.98 8.23 7 9.2 4.02-.97 7-4.94 7-9.2V5.9L12 3.3Zm2.25 8.7a.75.75 0 0 1 .75.75v2.75h-6v-2.75a.75.75 0 0 1 .75-.75h.25v-.75a2 2 0 1 1 4 0V12h.25Zm-2.25 3.25a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Zm1-3.25v-.75a1 1 0 1 0-2 0V12h2Z" />
    </svg>
  )
}

function ShieldLockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props}>
      <path d="M12 3.8 5.5 6.2v4.4c0 3.9 2.7 7.5 6.5 8.4 3.8-.9 6.5-4.5 6.5-8.4V6.2L12 3.8Z" />
      <rect height="3.5" rx=".5" width="5.5" x="9.25" y="12.5" />
      <path d="M10.5 12.5v-1a1.5 1.5 0 0 1 3 0v1" />
    </svg>
  )
}

function ShoppingBagFilledIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="currentColor" stroke="none">
      <path d="M7 7V6.5a5 5 0 1 1 10 0V7h1.35c.78 0 1.41.67 1.34 1.45l-.9 10A1.5 1.5 0 0 1 17.3 19.8H6.7a1.5 1.5 0 0 1-1.49-1.35l-.9-10A1.35 1.35 0 0 1 5.65 7H7Zm2 0h6V6.5a3 3 0 1 0-6 0V7Z" />
    </svg>
  )
}

function ShoppingBagIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props}>
      <path d="M6.5 8h11l1 10.5a1 1 0 0 1-1 1.1h-11a1 1 0 0 1-1-1.1L6.5 8Z" />
      <path d="M9 8V6.5a3 3 0 1 1 6 0V8" />
    </svg>
  )
}

function TaskAltFilledIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="currentColor" stroke="none">
      <path d="M12 3.5a8.5 8.5 0 1 0 8.48 9.13.75.75 0 1 0-1.5-.11A7 7 0 1 1 12 5a6.9 6.9 0 0 1 3.53.96.75.75 0 0 0 .76-1.3A8.42 8.42 0 0 0 12 3.5Zm9.28 2.22a.75.75 0 0 0-1.06 0l-8.14 8.15-2.3-2.3a.75.75 0 1 0-1.06 1.06l2.83 2.83a.75.75 0 0 0 1.06 0l8.67-8.68a.75.75 0 0 0 0-1.06Z" />
    </svg>
  )
}

function TaskAltIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props}>
      <path d="M20 12a8 8 0 1 1-4-6.93" />
      <path d="m8.5 12.5 2.3 2.3 7.7-7.8" />
    </svg>
  )
}

function TuneIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props}>
      <path d="M4 21v-7" />
      <path d="M4 10V3" />
      <path d="M12 21v-9" />
      <path d="M12 8V3" />
      <path d="M20 21v-5" />
      <path d="M20 12V3" />
      <path d="M2 14h4" />
      <path d="M10 8h4" />
      <path d="M18 16h4" />
    </svg>
  )
}

function VerifiedUserFilledIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="currentColor" stroke="none">
      <path d="M12 3.3 5 5.9v4.8c0 4.26 2.98 8.23 7 9.2 4.02-.97 7-4.94 7-9.2V5.9L12 3.3Zm3.46 6.92-3.95 4.18a.75.75 0 0 1-1.08.01l-1.88-1.88a.75.75 0 0 1 1.06-1.06l1.34 1.34 3.4-3.6a.75.75 0 0 1 1.1 1.01Z" />
    </svg>
  )
}

function VerifiedUserIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props}>
      <path d="M12 3.8 5.5 6.2v4.4c0 3.9 2.7 7.5 6.5 8.4 3.8-.9 6.5-4.5 6.5-8.4V6.2L12 3.8Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}
