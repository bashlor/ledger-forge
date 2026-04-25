import type { RefObject } from 'react'

import { Form, Link } from '@adonisjs/inertia/react'
import { type Data } from '@generated/data'
import { useEffect, useId, useRef, useState } from 'react'

import { AppIcon } from '~/components/app_icon'
import { DateScopeControls } from '~/components/date_scope_controls'

import { pageDescriptions } from './config'

interface AppTopbarProps {
  displayName: string
  email: string
  initials: string
  pageLabel: string
  readOnlyBadge: null | string
  showDateScopeControls: boolean
  todayLine: string
  workspace: Data.SharedProps['workspace']
}

export function AppTopbar({
  displayName,
  email,
  initials,
  pageLabel,
  readOnlyBadge,
  showDateScopeControls,
  todayLine,
  workspace,
}: AppTopbarProps) {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const accountMenuRef = useRef<HTMLDivElement>(null)
  const accountMenuId = useId()
  useCloseOnOutsideAndEscape(accountMenuOpen, setAccountMenuOpen, accountMenuRef)

  return (
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
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate font-headline text-sm font-semibold text-on-surface sm:text-base">
                {pageLabel}
              </p>
              {readOnlyBadge ? (
                <span className="inline-flex shrink-0 rounded-md border border-amber-500/30 bg-amber-500/12 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                  {readOnlyBadge}
                </span>
              ) : null}
            </div>
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
  )
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
