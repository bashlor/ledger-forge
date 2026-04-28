import { Form, Link } from '@adonisjs/inertia/react'

import { AppIcon } from '~/components/app_icon'
import { LedgerForgeMark } from '~/components/ledger_forge_brand'

import { type AppNavLink, isActive, mainNavLinks } from './config'
import { SHELL_SIDEBAR_WIDTH_CLASS } from './shell_layout'

interface AppSidebarProps {
  devToolsEnabled: boolean
  devToolsHref: string
  initials: string
  navLinks?: readonly AppNavLink[]
  showAccountingNav: boolean
  url: string
  workspaceLabel: string
}

export function AppSidebar({
  devToolsEnabled,
  devToolsHref,
  initials,
  navLinks = mainNavLinks,
  showAccountingNav,
  url,
  workspaceLabel,
}: AppSidebarProps) {
  const devToolsActive = isActive(url, '/_dev')
  const homeHref = showAccountingNav ? (navLinks[0]?.href ?? '/customers') : devToolsHref

  return (
    <aside
      className={`fixed left-0 top-0 z-50 hidden h-dvh min-h-0 flex-col border-r border-slate-200/90 bg-surface-container-lowest pt-5 pb-4 shadow-[1px_0_0_rgba(15,23,42,0.04)] lg:flex ${SHELL_SIDEBAR_WIDTH_CLASS}`}
    >
      <div className="flex min-h-0 flex-1 flex-col px-3">
        <Link
          aria-label="Ledger Forge home"
          className="flex min-h-[2.875rem] shrink-0 items-center gap-3 rounded-xl border border-transparent px-2.5 py-2 outline-hidden transition-all duration-200 hover:border-slate-200/90 hover:bg-slate-50/90 focus-visible:ring-2 focus-visible:ring-primary/20"
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
          className="mt-6 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain font-headline text-[13px] leading-tight"
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

        <div className="mt-4 shrink-0 border-t border-slate-200/80 pt-3">
          <div className="flex items-center gap-2 rounded-xl px-2 py-1.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-800 ring-1 ring-slate-200/80">
              {initials}
            </div>
            <p className="min-w-0 flex-1 truncate text-[12px] font-semibold leading-tight text-slate-800">
              {workspaceLabel}
            </p>
            <Form className="inline shrink-0" route="signout.store">
              <button
                aria-label="Sign out"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-900"
                title="Sign out"
                type="submit"
              >
                <AppIcon name="logout" size={18} />
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
        {secondaryIcon ? (
          <span className="absolute -bottom-px -right-px flex h-3.5 w-3.5 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
            <AppIcon
              className={active ? 'text-primary' : 'text-slate-500'}
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
