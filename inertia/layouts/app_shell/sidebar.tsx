import { Form, Link } from '@adonisjs/inertia/react'

import { AppIcon } from '~/components/app_icon'

import { type AppNavLink, isActive, mainNavLinks } from './config'

interface AppSidebarProps {
  devToolsEnabled: boolean
  devToolsHref: string
  displayName: string
  email: string
  initials: string
  navLinks?: readonly AppNavLink[]
  showAccountingNav: boolean
  url: string
}

export function AppSidebar({
  devToolsEnabled,
  devToolsHref,
  displayName,
  email,
  initials,
  navLinks = mainNavLinks,
  showAccountingNav,
  url,
}: AppSidebarProps) {
  const devToolsActive = isActive(url, '/_dev')
  const homeHref = showAccountingNav ? (navLinks[0]?.href ?? '/customers') : devToolsHref

  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-screen w-64 flex-col bg-surface-container-highest px-4 pb-6 pt-0 lg:flex">
      <Link
        aria-label="Ledger Forge home"
        className="-mx-2 flex min-h-16 items-center gap-2.5 rounded-xl px-2 outline-hidden transition-colors hover:bg-surface-container-lowest/40 focus-visible:ring-2 focus-visible:ring-primary/30"
        href={homeHref}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg milled-steel-gradient shadow-sm">
          <AppIcon className="text-on-primary" filled name="account_balance" size={20} />
        </div>
        <div className="flex min-w-0 flex-col justify-center py-1">
          <p className="font-headline text-[15px] font-extrabold leading-tight text-on-surface">
            Ledger Forge
          </p>
          <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
            Demo workspace
          </p>
        </div>
      </Link>

      <nav
        aria-label="Primary"
        className="mt-2 flex flex-1 flex-col space-y-1 overflow-y-auto font-headline text-sm tracking-wide"
      >
        {showAccountingNav
          ? navLinks.map((link) => (
              <SidebarLink
                active={isActive(url, link.href)}
                href={link.href}
                icon={link.icon}
                key={link.href}
                label={link.label}
              />
            ))
          : null}
        {devToolsEnabled ? (
          <SidebarLink
            active={devToolsActive}
            href={devToolsHref}
            icon="tune"
            label="Dev Tools"
            secondaryIcon="monitoring"
          />
        ) : null}
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
  )
}

function SidebarLink({
  active,
  href,
  icon,
  label,
  secondaryIcon,
}: {
  active: boolean
  href: string
  icon: string
  label: string
  secondaryIcon?: string
}) {
  return (
    <Link
      className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-300 ${
        active
          ? 'border-l-2 border-primary bg-surface-container-lowest font-bold text-on-surface shadow-ambient-tight'
          : 'border-l-2 border-transparent text-on-surface-variant hover:bg-surface-container-lowest/35 hover:text-on-surface'
      }`}
      href={href}
    >
      <span className="relative flex h-[22px] w-[22px] shrink-0 items-center justify-center">
        <AppIcon
          className={active ? 'text-primary' : 'text-on-surface-variant'}
          filled={active}
          name={icon}
          size={22}
        />
        {secondaryIcon ? (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-outline-variant/15 bg-surface-container-lowest/95 shadow-sm">
            <AppIcon
              className={active ? 'text-primary' : 'text-on-surface-variant'}
              filled={active}
              name={secondaryIcon}
              size={10}
            />
          </span>
        ) : null}
      </span>
      <span>{label}</span>
    </Link>
  )
}
