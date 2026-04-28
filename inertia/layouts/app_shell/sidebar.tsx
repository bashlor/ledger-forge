import { Form, Link } from '@adonisjs/inertia/react'

import { AppIcon } from '~/components/app_icon'
import { LedgerForgeMark } from '~/components/ledger_forge_brand'

import { type AppNavLink, isActive, mainNavLinks } from './config'
import { SHELL_SIDEBAR_WIDTH_CLASS } from './shell_layout'

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
    <aside
      className={`fixed left-0 top-0 z-50 hidden h-dvh min-h-0 flex-col border-r border-outline-variant bg-surface-container-lowest pt-4 pb-4 lg:flex ${SHELL_SIDEBAR_WIDTH_CLASS}`}
    >
      <div className="flex min-h-0 flex-1 flex-col px-3">
        <Link
          aria-label="Ledger Forge home"
          className="flex min-h-[2.625rem] shrink-0 items-center gap-2.5 rounded-lg px-2 py-1.5 outline-hidden transition-colors hover:bg-surface-container-low focus-visible:ring-2 focus-visible:ring-primary/20"
          href={homeHref}
        >
          <LedgerForgeMark className="shrink-0 text-primary" size={20} />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate font-headline text-[13px] font-semibold tracking-tight text-on-surface">
              Ledger Forge
            </p>
            <p className="mt-0.5 truncate text-[9px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
              Demo workspace
            </p>
          </div>
        </Link>

        <nav
          aria-label="Primary"
          className="mt-4 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain font-headline text-[13px] leading-tight"
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

        <div className="-mx-3 mt-4 shrink-0 border-t border-outline-variant px-3 pt-3">
          <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-container-low/90">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-container-high text-[11px] font-semibold text-on-surface ring-1 ring-outline-variant/50">
              {initials}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[13px] font-medium text-on-surface">{displayName}</p>
              <p className="truncate text-[11px] text-on-surface-variant">{email}</p>
            </div>
            <Form className="inline shrink-0" route="signout.store">
              <button
                aria-label="Sign out from sidebar"
                className="-mr-0.5 shrink-0 rounded-md p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-error"
                title="Sign out"
                type="submit"
              >
                <AppIcon name="logout" size={17} />
              </button>
            </Form>
          </div>
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
      className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 font-medium transition-colors duration-150 ${
        active
          ? 'bg-primary/5 font-semibold text-primary'
          : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
      }`}
      href={href}
    >
      <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
        <AppIcon
          className={active ? 'text-primary' : 'text-on-surface-variant'}
          filled={active}
          name={icon}
          size={20}
        />
        {secondaryIcon ? (
          <span className="absolute -bottom-px -right-px flex h-3.5 w-3.5 items-center justify-center rounded-full border border-outline-variant bg-surface-container-lowest shadow-sm">
            <AppIcon
              className={active ? 'text-primary' : 'text-on-surface-variant'}
              filled={active}
              name={secondaryIcon}
              size={9}
            />
          </span>
        ) : null}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </Link>
  )
}
