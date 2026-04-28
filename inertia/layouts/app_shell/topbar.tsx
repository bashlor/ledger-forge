import type { RefObject } from 'react'

import { Form, Link } from '@adonisjs/inertia/react'
import { type Data } from '@generated/data'
import { useEffect, useId, useRef, useState } from 'react'

import { AppIcon } from '~/components/app_icon'
import { DateScopeControls } from '~/components/date_scope_controls'
import { LedgerForgeMark } from '~/components/ledger_forge_brand'

import { pageDescriptions } from './config'
import { SHELL_CONTENT_GUTTER_CLASS, SHELL_MAIN_MAX_WIDTH_CLASS } from './shell_layout'

interface AppTopbarProps {
  displayName: string
  email: string
  initials: string
  pageLabel: string
  readOnlyBadge: null | string
  showDateScopeControls: boolean
  suppressPrimaryTitle: boolean
  todayLine: string
  workspace: Data.SharedProps['workspace']
}

export function AppTopbar({
  displayName,
  email: _email,
  initials,
  pageLabel,
  readOnlyBadge,
  showDateScopeControls,
  suppressPrimaryTitle,
  todayLine,
  workspace,
}: AppTopbarProps) {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const accountMenuRef = useRef<HTMLDivElement>(null)
  const accountMenuId = useId()
  useCloseOnOutsideAndEscape(accountMenuOpen, setAccountMenuOpen, accountMenuRef)

  return (
    <header className="sticky top-0 z-40 w-full min-w-0 border-b border-slate-200/95 bg-white/90 shadow-sm shadow-slate-900/[0.03] backdrop-blur-md">
      <div className={SHELL_CONTENT_GUTTER_CLASS}>
        <div
          className={`flex h-14 w-full min-w-0 items-center gap-3 sm:h-[3.75rem] sm:gap-4 ${SHELL_MAIN_MAX_WIDTH_CLASS}`}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3 lg:gap-4">
            <Link
              aria-label="Ledger Forge — dashboard"
              className="hidden shrink-0 items-center gap-2.5 rounded-lg border-r border-slate-200/90 py-1 pr-5 mr-2 outline-hidden transition-colors duration-200 hover:bg-slate-50 lg:flex"
              href="/dashboard"
            >
              <LedgerForgeMark className="text-primary" size={22} />
              <span className="font-headline text-sm font-semibold tracking-tight text-slate-900">
                Ledger Forge
              </span>
            </Link>

            <Link
              aria-label="Go to dashboard"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg outline-hidden transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-primary/25 lg:hidden"
              href="/dashboard"
            >
              <LedgerForgeMark size={20} />
            </Link>

            <div className="min-w-0 flex-1">
              {suppressPrimaryTitle && workspace ? (
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="truncate font-headline text-sm font-semibold tracking-tight text-slate-900">
                    {workspace.name}
                  </p>
                  {readOnlyBadge ? (
                    <span className="inline-flex shrink-0 rounded-md border border-amber-200/90 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
                      {readOnlyBadge}
                    </span>
                  ) : null}
                  {workspace.isAnonymousWorkspace ? (
                    <span className="inline-flex shrink-0 rounded-md border border-slate-200/90 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                      Anonymous
                    </span>
                  ) : null}
                </div>
              ) : (
                <>
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate font-headline text-sm font-semibold tracking-tight text-slate-900">
                      {pageLabel}
                    </p>
                    {readOnlyBadge ? (
                      <span className="inline-flex shrink-0 rounded-md border border-amber-200/90 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
                        {readOnlyBadge}
                      </span>
                    ) : null}
                  </div>
                  {workspace ? (
                    <p className="mt-0.5 truncate text-[11px] leading-snug text-slate-600">
                      <span className="font-medium text-slate-700">{workspace.name}</span>
                      {workspace.isAnonymousWorkspace ? (
                        <span className="ml-1.5 inline-flex shrink-0 rounded border border-slate-200 bg-slate-50 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                          Anonymous
                        </span>
                      ) : null}
                    </p>
                  ) : (
                    <p className="mt-0.5 hidden truncate text-[11px] text-slate-600 sm:block">
                      {pageDescriptions[pageLabel] ?? pageDescriptions.Overview}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            {showDateScopeControls ? (
              <div className="flex h-9 items-center gap-1 rounded-lg border border-slate-200/95 bg-white px-1 shadow-sm ring-1 ring-slate-900/[0.04] transition-shadow duration-200 hover:border-slate-300/90 hover:shadow-md">
                <span
                  aria-hidden="true"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500"
                >
                  <AppIcon name="date_range" size={18} />
                </span>
                <div className="h-5 w-px shrink-0 bg-slate-200" aria-hidden="true" />
                <DateScopeControls />
              </div>
            ) : (
              <div className="flex h-9 items-center rounded-lg border border-slate-200/95 bg-slate-50/90 px-2.5 shadow-sm">
                <p className="font-headline text-[13px] font-medium tabular-nums text-slate-900">
                  {todayLine}
                </p>
              </div>
            )}

            <div aria-hidden="true" className="hidden h-5 w-px shrink-0 bg-slate-200 sm:block" />

            <div className="relative" ref={accountMenuRef}>
              <button
                aria-controls={accountMenuOpen ? `${accountMenuId}-menu` : undefined}
                aria-expanded={accountMenuOpen}
                aria-haspopup="menu"
                aria-label={`Account menu — ${displayName}`}
                className={`flex items-center gap-2 rounded-xl border border-transparent px-1.5 py-1 outline-hidden transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/25 sm:px-2 ${
                  accountMenuOpen
                    ? 'border-slate-200 bg-slate-50 shadow-sm'
                    : 'hover:border-slate-200/90 hover:bg-slate-50/80'
                }`}
                id={`${accountMenuId}-trigger`}
                onClick={() => setAccountMenuOpen((openState) => !openState)}
                type="button"
              >
                <span className="hidden max-w-[9rem] truncate text-left text-[13px] font-semibold leading-tight text-slate-900 sm:block">
                  {displayName}
                </span>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-800 ring-1 ring-slate-200/90">
                  {initials}
                </div>
                <AppIcon
                  className={`hidden shrink-0 text-slate-500 transition-transform duration-200 sm:block ${accountMenuOpen ? 'rotate-180' : ''}`}
                  name="expand_more"
                  size={18}
                />
              </button>

              {accountMenuOpen ? (
                <div
                  aria-labelledby={`${accountMenuId}-trigger`}
                  className="absolute right-0 top-full z-50 mt-2 min-w-[12rem] overflow-hidden rounded-xl border border-slate-200/95 bg-white py-1 shadow-lg shadow-slate-900/12"
                  id={`${accountMenuId}-menu`}
                  role="menu"
                >
                  <Link
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] font-medium text-slate-800 transition-colors duration-150 hover:bg-slate-50 focus-visible:bg-slate-50"
                    href="/account"
                    onClick={() => setAccountMenuOpen(false)}
                    role="menuitem"
                  >
                    <AppIcon name="settings" size={18} />
                    Settings
                  </Link>
                  <Form className="contents" route="signout.store">
                    <button
                      className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] font-medium text-slate-800 transition-colors duration-150 hover:bg-slate-50 hover:text-error focus-visible:bg-slate-50"
                      onClick={() => setAccountMenuOpen(false)}
                      role="menuitem"
                      type="submit"
                    >
                      <AppIcon name="logout" size={18} />
                      Sign out
                    </button>
                  </Form>
                </div>
              ) : null}
            </div>
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
