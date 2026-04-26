import type { ReactNode } from 'react'

import { type Data } from '@generated/data'
import { usePage } from '@inertiajs/react'
import { useEffect } from 'react'
import { toast, Toaster } from 'sonner'

import { DateScopeProvider } from '~/components/date_scope_provider'
import { todayDateOnlyUtc } from '~/lib/date'
import { formatTopbarDate, getInitials } from '~/lib/format'

import { pageLabelForUrl, visibleMainNavLinks } from './app_shell/config'
import { MobileNav } from './app_shell/mobile_nav'
import { AppSidebar } from './app_shell/sidebar'
import { AppTopbar } from './app_shell/topbar'

interface ReadOnlyPageProps extends Data.SharedProps {
  accountingReadOnly?: boolean
  inspector?: {
    context?: {
      readOnlyBadge?: string
    }
  }
}

export default function AppShellLayout({ children }: { children: ReactNode }) {
  return (
    <DateScopeProvider>
      <AppShellFrame>{children}</AppShellFrame>
    </DateScopeProvider>
  )
}

function AppShellFrame({ children }: { children: ReactNode }) {
  const page = usePage<Data.SharedProps>()
  const url = page.url.split('?')[0]
  const readOnlyBadge = resolveReadOnlyBadge(page.props as ReadOnlyPageProps, url)
  const user = page.props.user
  const notification = page.props.flash?.notification
  const email = user?.email ?? ''
  const displayName =
    (user?.fullName && user.fullName.trim()) || (email ? email.split('@')[0] : '') || 'Account'
  const initials = user?.initials ?? getInitials(displayName || email || 'PL')
  const pageLabel = pageLabelForUrl(url)
  const workspace = page.props.workspace
  const devToolsEnabled = page.props.devTools?.enabled ?? false
  const devToolsHref = page.props.devTools?.accessHref ?? '/_dev/access'
  const showAccountingNav = user?.isDevOperator !== true
  const navLinks = showAccountingNav ? visibleMainNavLinks(page.props.permissions) : []
  const hasMobileNav = navLinks.length + (devToolsEnabled ? 1 : 0) > 0
  const todayLine = formatTopbarDate(todayDateOnlyUtc())
  const showDateScopeControls =
    url === '/dashboard' || url.startsWith('/expenses') || url.startsWith('/invoices')

  useEffect(() => {
    toast.dismiss()
    if (notification?.type === 'error') toast.error(notification.message)
    if (notification?.type === 'success') toast.success(notification.message)
  }, [page.url, notification])

  return (
    <div className="min-h-screen w-full bg-background text-on-surface">
      <AppSidebar
        devToolsEnabled={devToolsEnabled}
        devToolsHref={devToolsHref}
        displayName={displayName}
        email={email}
        initials={initials}
        navLinks={navLinks}
        showAccountingNav={showAccountingNav}
        url={url}
      />

      <div className="flex min-h-screen w-full min-w-0 flex-col lg:pl-64">
        <AppTopbar
          displayName={displayName}
          email={email}
          initials={initials}
          pageLabel={pageLabel}
          readOnlyBadge={readOnlyBadge}
          showDateScopeControls={showDateScopeControls}
          todayLine={todayLine}
          workspace={workspace}
        />

        <main
          className={`w-full min-w-0 flex-1 bg-surface px-4 pt-6 sm:px-6 lg:px-10 lg:pt-10 ${
            hasMobileNav ? 'pb-24 lg:pb-10' : 'pb-6 lg:pb-10'
          }`}
        >
          {children}
        </main>

        <MobileNav
          devToolsEnabled={devToolsEnabled}
          devToolsHref={devToolsHref}
          navLinks={navLinks}
          showAccountingNav={showAccountingNav}
          url={url}
        />
      </div>
      <Toaster position="top-center" richColors />
    </div>
  )
}

function resolveReadOnlyBadge(props: ReadOnlyPageProps, url: string): null | string {
  if (url.startsWith('/_dev/inspector')) {
    return props.inspector?.context?.readOnlyBadge ?? 'Read-Only Access'
  }

  return props.accountingReadOnly ? 'Read-Only' : null
}
