import { Link } from '@adonisjs/inertia/react'

import { AppIcon } from '~/components/app_icon'

import { type AppNavLink, isActive, mainNavLinks } from './config'

interface MobileNavProps {
  devToolsEnabled: boolean
  devToolsHref: string
  navLinks?: readonly AppNavLink[]
  showAccountingNav?: boolean
  url: string
}

export function MobileNav({
  devToolsEnabled,
  devToolsHref,
  navLinks = mainNavLinks,
  showAccountingNav = true,
  url,
}: MobileNavProps) {
  const devToolsActive = isActive(url, '/_dev')
  const mainCount = showAccountingNav ? navLinks.length : 0
  const devCount = devToolsEnabled ? 1 : 0
  const itemCount = mainCount + devCount

  if (itemCount === 0) {
    return null
  }

  const gridColsClass = gridColumnsClass(itemCount)

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-outline-variant bg-surface-container-lowest/95 p-2 shadow-[0_-4px_24px_rgba(15,23,42,0.08)] backdrop-blur-md sm:inset-x-3 sm:bottom-3 sm:rounded-2xl sm:border sm:border-outline-variant lg:hidden">
      <div className={`grid gap-1 ${gridColsClass}`}>
        {showAccountingNav
          ? navLinks.map((link) => {
              const active = isActive(url, link.href)
              return (
                <Link
                  className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-headline font-medium transition-colors duration-150 ${
                    active
                      ? 'bg-primary-container font-semibold text-primary'
                      : 'text-on-surface-variant'
                  }`}
                  href={link.href}
                  key={link.href}
                >
                  <AppIcon filled={active} name={link.icon} size={18} />
                  <span>{link.label}</span>
                </Link>
              )
            })
          : null}
        {devToolsEnabled ? (
          <Link
            className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-headline font-medium transition-colors duration-150 ${
              devToolsActive
                ? 'bg-primary-container font-semibold text-primary'
                : 'text-on-surface-variant'
            }`}
            href={devToolsHref}
          >
            <span className="relative flex h-8 w-full items-center justify-center">
              <AppIcon filled={devToolsActive} name="tune" size={17} />
              <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-outline-variant bg-surface-container-lowest shadow-sm">
                <AppIcon
                  className={devToolsActive ? 'text-primary' : 'text-on-surface-variant'}
                  filled={devToolsActive}
                  name="monitoring"
                  size={10}
                />
              </span>
            </span>
            <span>Dev</span>
          </Link>
        ) : null}
      </div>
    </nav>
  )
}

function gridColumnsClass(itemCount: number): string {
  switch (itemCount) {
    case 1:
      return 'grid-cols-1'
    case 2:
      return 'grid-cols-2'
    case 3:
      return 'grid-cols-3'
    case 4:
      return 'grid-cols-4'
    case 5:
      return 'grid-cols-5'
    default:
      return 'grid-cols-6'
  }
}
