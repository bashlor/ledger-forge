import { Link } from '@adonisjs/inertia/react'

import { AppIcon } from '~/components/app_icon'
import { LedgerForgeMark } from '~/components/ledger_forge_brand'

import { type AppNavLink, isActive, mainNavLinks } from './config'
import { SHELL_SIDEBAR_WIDTH_CLASS } from './shell_layout'

interface AppSidebarProps {
  devToolsEnabled: boolean
  devToolsHref: string
  navLinks?: readonly AppNavLink[]
  showAccountingNav: boolean
  url: string
}

export function AppSidebar({
  devToolsEnabled,
  devToolsHref,
  navLinks = mainNavLinks,
  showAccountingNav,
  url,
}: AppSidebarProps) {
  const devToolsActive = isActive(url, '/_dev')
  const homeHref = showAccountingNav ? (navLinks[0]?.href ?? '/customers') : devToolsHref

  return (
    <aside
      className={`fixed left-0 top-0 z-50 hidden h-dvh min-h-0 flex-col border-r border-slate-200/90 bg-surface-container-lowest pb-4 shadow-[1px_0_0_rgba(15,23,42,0.04)] lg:flex ${SHELL_SIDEBAR_WIDTH_CLASS}`}
    >
      <div className="flex min-h-0 flex-1 flex-col px-3 pt-0">
        <Link
          aria-label="Ledger Forge home"
          className="flex h-14 shrink-0 items-center gap-2.5 rounded-xl border border-transparent px-2.5 outline-hidden transition-all duration-200 hover:border-slate-200/90 hover:bg-slate-50/90 focus-visible:ring-2 focus-visible:ring-primary/20 sm:h-[3.75rem] sm:gap-3"
          href={homeHref}
        >
          <LedgerForgeMark className="shrink-0 text-primary" size={22} />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate font-headline text-[14px] font-semibold tracking-tight text-slate-950">
              Ledger Forge
            </p>
            <p className="mt-0.5 truncate text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Demo workspace
            </p>
          </div>
        </Link>

        <nav
          aria-label="Primary"
          className="mt-4 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain font-headline text-[13px] leading-tight"
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
            />
          ) : null}
        </nav>
      </div>
    </aside>
  )
}

function SidebarLink({
  active,
  href,
  icon,
  label,
}: {
  active: boolean
  href: string
  icon: string
  label: string
}) {
  return (
    <Link
      className={`group flex items-center gap-3 rounded-lg border-l-2 py-2 pr-2 pl-2.5 font-medium transition-colors duration-200 ${
        active
          ? 'border-primary bg-primary/[0.07] font-semibold text-primary shadow-sm shadow-primary/[0.07]'
          : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      }`}
      href={href}
    >
      <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
        <AppIcon
          className={active ? 'text-primary' : 'text-slate-500 group-hover:text-slate-800'}
          filled={active}
          name={icon}
          size={20}
        />
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </Link>
  )
}
