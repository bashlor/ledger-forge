import type { ReactNode } from 'react'

import { Link } from '@adonisjs/inertia/react'
import { type Data } from '@generated/data'
import { usePage } from '@inertiajs/react'
import { useEffect } from 'react'
import { toast, Toaster } from 'sonner'

import { AppIcon } from '~/components/app_icon'

export default function PublicLayout({ children }: { children: ReactNode }) {
  const page = usePage<Data.SharedProps>()
  const notification = page.props.flash?.notification

  useEffect(() => {
    toast.dismiss()
    if (notification?.type === 'error') toast.error(notification.message)
    if (notification?.type === 'success') toast.success(notification.message)
  }, [page.url, notification])
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="shrink-0 px-4 py-4 sm:px-6">
        <Link
          className="inline-flex items-center gap-2 font-headline text-sm font-extrabold text-primary-dim transition-colors hover:text-primary"
          href="/signin"
        >
          <AppIcon className="text-primary" filled name="account_balance_wallet" size={20} />
          <span>Precision Ledger</span>
        </Link>
      </header>
      {children}
      <Toaster position="top-center" richColors />
    </div>
  )
}
