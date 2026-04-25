import { Link } from '@adonisjs/inertia/react'

import { AppIcon } from '~/components/app_icon'

import { isActive, mainNavLinks } from './config'

export function MobileNav({ url }: { url: string }) {
  return (
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
  )
}
