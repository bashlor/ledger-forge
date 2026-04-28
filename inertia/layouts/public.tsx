import type { ReactNode } from 'react'

import { type Data } from '@generated/data'
import { usePage } from '@inertiajs/react'
import { useEffect } from 'react'
import { toast, Toaster } from 'sonner'

import { LedgerForgeMark } from '~/components/ledger_forge_brand'

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
      <header className="shrink-0 px-4 py-4 sm:px-6 sm:py-5">
        <a
          className="inline-flex items-center gap-2.5 font-headline text-base font-extrabold tracking-tight text-primary-dim transition-colors hover:text-primary"
          href="/"
        >
          <LedgerForgeMark size={24} />
          <span>Ledger Forge</span>
        </a>
      </header>
      {children}
      <Toaster position="top-center" richColors />
    </div>
  )
}
