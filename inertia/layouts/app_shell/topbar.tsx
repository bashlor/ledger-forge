import type { RefObject } from 'react'

import { Form, Link } from '@adonisjs/inertia/react'
import { type Data } from '@generated/data'
import { useEffect, useId, useRef, useState } from 'react'

import { AppIcon } from '~/components/app_icon'
import { DateScopeControls } from '~/components/date_scope_controls'
import { LedgerForgeMark } from '~/components/ledger_forge_brand'

import { pageDescriptions } from './config'
import { SHELL_CONTENT_GUTTER_CLASS } from './shell_layout'

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
    <header className="sticky top-0 z-40 w-full min-w-0 border-b border-outline-variant bg-surface-container-lowest/90 backdrop-blur-md">
      <div
        className={`flex h-14 w-full min-w-0 items-center gap-3 sm:gap-4 ${SHELL_CONTENT_GUTTER_CLASS}`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
          <Link
            aria-label="Go to dashboard"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg outline-hidden transition-colors hover:bg-surface-container-low focus-visible:ring-2 focus-visible:ring-primary/25 lg:hidden"
            href="/dashboard"
          >
            <LedgerForgeMark size={20} />
          </Link>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate font-headline text-sm font-semibold tracking-tight text-on-surface">
                {pageLabel}
              </p>
              {readOnlyBadge ? (
                <span className="inline-flex shrink-0 rounded-md border border-amber-200/90 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
                  {readOnlyBadge}
                </span>
              ) : null}
            </div>
            {workspace ? (
              <p className="mt-0.5 truncate text-[11px] leading-snug text-on-surface-variant">
                <span className="font-medium text-on-surface/85">{workspace.name}</span>
                {workspace.isAnonymousWorkspace ? (
                  <span className="ml-1.5 inline-flex shrink-0 rounded border border-outline-variant bg-surface-container-low px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
                    Anonymous
                  </span>
                ) : null}
              </p>
            ) : (
              <p className="hidden truncate text-[11px] text-on-surface-variant sm:block">
                {pageDescriptions[pageLabel] ?? pageDescriptions.Overview}
              </p>
            )}
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          {showDateScopeControls ? (
            <div className="flex h-8 items-center rounded-lg border border-outline-variant bg-surface-container-lowest px-0.5 shadow-sm">
              <DateScopeControls />
            </div>
          ) : (
            <div className="flex h-8 items-center rounded-lg border border-outline-variant bg-surface-container-low/80 px-2.5">
              <p className="font-headline text-[13px] font-medium tabular-nums text-on-surface">
                {todayLine}
              </p>
            </div>
          )}

          <div
            aria-hidden="true"
            className="hidden h-5 w-px shrink-0 bg-outline-variant/60 sm:block"
          />

          <div className="relative" ref={accountMenuRef}>
            <button
              aria-controls={accountMenuOpen ? `${accountMenuId}-menu` : undefined}
              aria-expanded={accountMenuOpen}
              aria-haspopup="menu"
              className={`flex items-center gap-1.5 rounded-lg py-0.5 pl-0.5 pr-1.5 outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-primary/20 sm:gap-2 sm:pr-2 ${
                accountMenuOpen
                  ? 'bg-surface-container-low ring-1 ring-outline-variant/70'
                  : 'hover:bg-surface-container-low/70'
              }`}
              id={`${accountMenuId}-trigger`}
              onClick={() => setAccountMenuOpen((openState) => !openState)}
              type="button"
            >
              <div className="hidden text-right sm:block">
                <p className="text-[13px] font-medium leading-tight text-on-surface">{displayName}</p>
                <p className="max-w-[8.5rem] truncate text-[11px] text-on-surface-variant">
                  {email}
                </p>
              </div>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-container-high text-[11px] font-semibold text-on-surface ring-1 ring-outline-variant/50">
                {initials}
              </div>
              <AppIcon
                className={`hidden text-on-surface-variant/70 transition-transform sm:block ${accountMenuOpen ? 'rotate-180' : ''}`}
                name="expand_more"
                size={18}
              />
            </button>

            {accountMenuOpen ? (
              <div
                aria-labelledby={`${accountMenuId}-trigger`}
                className="absolute right-0 top-full z-50 mt-1.5 min-w-[11.5rem] overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest py-1 shadow-lg shadow-slate-900/8"
                id={`${accountMenuId}-menu`}
                role="menu"
              >
                <Link
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-medium text-on-surface transition-colors hover:bg-surface-container-low focus-visible:bg-surface-container-low"
                  href="/account"
                  onClick={() => setAccountMenuOpen(false)}
                  role="menuitem"
                >
                  <AppIcon name="settings" size={18} />
                  Settings
                </Link>
                <Form className="contents" route="signout.store">
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-medium text-on-surface transition-colors hover:bg-surface-container-low hover:text-error focus-visible:bg-surface-container-low"
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
