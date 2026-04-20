import type { ReactNode } from 'react'

import { Form, Link } from '@adonisjs/inertia/react'
import { type Data } from '@generated/data'
import { usePage } from '@inertiajs/react'
import { type RefObject, useEffect, useId, useRef, useState } from 'react'
import { toast, Toaster } from 'sonner'

import { AppIcon } from '~/components/app_icon'
import { DateScopeControls } from '~/components/date_scope_controls'
import { DateScopeProvider } from '~/components/date_scope_provider'
import { formatTopbarDate, getInitials } from '~/lib/format'

const mainNavLinks = [
  { href: '/dashboard', icon: 'dashboard', label: 'Overview' },
  { href: '/customers', icon: 'business', label: 'Customers' },
  { href: '/invoices', icon: 'receipt_long', label: 'Invoices' },
  { href: '/expenses', icon: 'payments', label: 'Expenses' },
] as const

const pageDescriptions: Record<string, string> = {
  Customers: 'Billable contacts available for invoicing.',
  Expenses: 'Recorded expenses that feed into profit.',
  Invoices: 'Create, issue, and settle customer invoices.',
  Overview: 'Summary of revenue, expenses, and recent invoices.',
  Settings: 'Account and workspace preferences.',
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
  const user = page.props.user
  const notification = page.props.flash?.notification
  const email = user?.email ?? ''
  const displayName =
    (user?.fullName && user.fullName.trim()) || (email ? email.split('@')[0] : '') || 'Account'
  const initials = user?.initials ?? getInitials(displayName || email || 'PL')
  const pageLabel = pageLabelForUrl(url)
  const workspace = page.props.workspace
  const todayLine = formatTopbarDate(new Date().toISOString().slice(0, 10))
  const showDateScopeControls =
    url === '/dashboard' || url.startsWith('/expenses') || url.startsWith('/invoices')

  useEffect(() => {
    toast.dismiss()
    if (notification?.type === 'error') toast.error(notification.message)
    if (notification?.type === 'success') toast.success(notification.message)
  }, [page.url, notification])

  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const accountMenuRef = useRef<HTMLDivElement>(null)
  const accountMenuId = useId()
  useCloseOnOutsideAndEscape(accountMenuOpen, setAccountMenuOpen, accountMenuRef)

  return (
    <div className="min-h-screen w-full bg-background text-on-surface">
      <aside className="fixed left-0 top-0 z-50 hidden h-screen w-64 flex-col bg-surface-container-highest px-4 pb-6 pt-0 lg:flex">
        <Link
          aria-label="Precision Ledger — Overview"
          className="flex min-h-16 items-center gap-2.5 rounded-xl px-2 -mx-2 outline-hidden transition-colors hover:bg-surface-container-lowest/40 focus-visible:ring-2 focus-visible:ring-primary/30"
          href="/dashboard"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg milled-steel-gradient shadow-sm">
            <AppIcon className="text-on-primary" filled name="account_balance" size={20} />
          </div>
          <div className="flex min-w-0 flex-col justify-center py-1">
            <p className="font-headline text-[15px] font-extrabold leading-tight text-on-surface">
              Precision Ledger
            </p>
            <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
              Accounting demo
            </p>
          </div>
        </Link>

        <nav
          aria-label="Primary"
          className="mt-2 flex flex-1 flex-col space-y-1 overflow-y-auto font-headline text-sm tracking-wide"
        >
          {mainNavLinks.map((link) => {
            const active = isActive(url, link.href)
            return (
              <Link
                className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-300 ${
                  active
                    ? 'border-l-2 border-primary bg-surface-container-lowest font-bold text-on-surface shadow-ambient-tight'
                    : 'border-l-2 border-transparent text-on-surface-variant hover:bg-surface-container-lowest/35 hover:text-on-surface'
                }`}
                href={link.href}
                key={link.href}
              >
                <AppIcon
                  className={active ? 'text-primary' : 'text-on-surface-variant'}
                  filled={active}
                  name={link.icon}
                  size={22}
                />
                <span>{link.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto shrink-0 border-t border-outline-variant/10 pt-6">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg milled-steel-gradient text-xs font-bold text-on-primary">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-on-surface">{displayName}</p>
              <p className="truncate text-xs text-on-surface-variant">{email}</p>
            </div>
            <Form className="inline shrink-0" route="signout.store">
              <button
                aria-label="Sign out from sidebar"
                className="shrink-0 rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-error"
                title="Sign out"
                type="submit"
              >
                <AppIcon name="logout" size={18} />
              </button>
            </Form>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen w-full min-w-0 flex-col lg:pl-64">
        <header className="sticky top-0 z-40 w-full border-b border-outline-variant/20 bg-surface-container-lowest/90 shadow-sm backdrop-blur-md">
          <div className="flex h-16 w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Link
                aria-label="Go to dashboard"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl milled-steel-gradient shadow-sm outline-hidden transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary/35 lg:hidden"
                href="/dashboard"
              >
                <AppIcon className="text-on-primary" filled name="account_balance" size={18} />
              </Link>
              <div className="min-w-0">
                <p className="truncate font-headline text-sm font-semibold text-on-surface sm:text-base">
                  {pageLabel}
                </p>
                {workspace ? (
                  <p className="mt-0.5 truncate text-xs text-on-surface-variant">
                    <span className="font-medium text-on-surface/90">{workspace.name}</span>
                    {workspace.isAnonymousWorkspace ? (
                      <span className="ml-2 inline-flex shrink-0 rounded-md border border-outline-variant/25 bg-surface-container-high/80 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
                        Anonymous
                      </span>
                    ) : null}
                  </p>
                ) : (
                  <p className="hidden truncate text-xs text-on-surface-variant sm:block">
                    {pageDescriptions[pageLabel] ?? pageDescriptions.Overview}
                  </p>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3 sm:gap-4 lg:gap-5">
              {showDateScopeControls ? (
                <DateScopeControls />
              ) : (
                <div className="flex items-center rounded-lg border border-outline-variant/15 bg-surface-container-high/70 px-2.5 py-1 shadow-sm">
                  <p className="font-headline text-sm font-bold tabular-nums text-on-surface sm:text-[15px]">
                    {todayLine}
                  </p>
                </div>
              )}

              <div
                aria-hidden="true"
                className="hidden h-7 w-px shrink-0 bg-outline-variant/25 sm:block"
              />

              <div className="relative" ref={accountMenuRef}>
                <button
                  aria-controls={accountMenuOpen ? `${accountMenuId}-menu` : undefined}
                  aria-expanded={accountMenuOpen}
                  aria-haspopup="menu"
                  className={`flex items-center gap-2 rounded-xl border py-1 pl-1 pr-2 outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary/30 sm:gap-3 sm:pr-3 ${
                    accountMenuOpen
                      ? 'border-outline-variant/30 bg-surface-container-high'
                      : 'border-transparent hover:border-outline-variant/20 hover:bg-surface-container-high/80'
                  }`}
                  id={`${accountMenuId}-trigger`}
                  onClick={() => setAccountMenuOpen((openState) => !openState)}
                  type="button"
                >
                  <div className="hidden text-right sm:block">
                    <p className="text-sm font-bold leading-tight text-on-surface">{displayName}</p>
                    <p className="max-w-[9rem] truncate text-xs text-on-surface-variant">{email}</p>
                  </div>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-container-highest text-xs font-bold text-on-surface ring-1 ring-outline-variant/10">
                    {initials}
                  </div>
                  <AppIcon
                    className={`hidden text-on-surface-variant transition-transform sm:block ${accountMenuOpen ? 'rotate-180' : ''}`}
                    name="expand_more"
                    size={20}
                  />
                </button>

                {accountMenuOpen ? (
                  <div
                    aria-labelledby={`${accountMenuId}-trigger`}
                    className="absolute right-0 top-full z-50 mt-2 min-w-[12rem] overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-lowest py-1 shadow-lg ring-1 ring-outline-variant/20"
                    id={`${accountMenuId}-menu`}
                    role="menu"
                  >
                    <Link
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high/80 focus-visible:bg-surface-container-high"
                      href="/account"
                      onClick={() => setAccountMenuOpen(false)}
                      role="menuitem"
                    >
                      <AppIcon name="settings" size={20} />
                      Settings
                    </Link>
                    <Form className="contents" route="signout.store">
                      <button
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high/80 hover:text-error focus-visible:bg-surface-container-high"
                        onClick={() => setAccountMenuOpen(false)}
                        role="menuitem"
                        type="submit"
                      >
                        <AppIcon name="logout" size={20} />
                        Sign out
                      </button>
                    </Form>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <main className="w-full min-w-0 flex-1 bg-surface px-4 pb-24 pt-6 sm:px-6 lg:px-10 lg:pb-10 lg:pt-10">
          {children}
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-outline-variant/10 bg-white/95 p-2 shadow-ambient backdrop-blur-md sm:inset-x-3 sm:bottom-3 sm:rounded-xl sm:border-0 lg:hidden">
          <div className="grid grid-cols-4 gap-1">
            {mainNavLinks.map((link) => {
              const active = isActive(url, link.href)
              return (
                <Link
                  className={`flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-[11px] font-headline font-medium transition-colors ${
                    active
                      ? 'bg-surface-container-lowest/80 font-bold text-primary'
                      : 'text-on-surface-variant'
                  }`}
                  href={link.href}
                  key={link.href}
                >
                  <AppIcon filled={active} name={link.icon} size={18} />
                  <span>{link.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      </div>
      <Toaster position="top-center" richColors />
    </div>
  )
}

function isActive(currentUrl: string, href: string) {
  return currentUrl === href || currentUrl.startsWith(`${href}/`)
}

function pageLabelForUrl(url: string) {
  if (url.startsWith('/account')) {
    return 'Settings'
  }

  const match = mainNavLinks.find((link) => isActive(url, link.href))
  return match?.label ?? 'Overview'
}

function useCloseOnOutsideAndEscape(
  open: boolean,
  setOpen: (value: boolean) => void,
  ref: RefObject<HTMLElement | null>
) {
  useEffect(() => {
    if (!open) return

    function onPointerDown(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, ref, setOpen])
}
