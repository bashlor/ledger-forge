import { AppIcon } from '~/components/app_icon'

import { ErrorHomeLink } from './error_home_link'

interface ErrorPageShellProps {
  code: string
  description: string
  icon: string
  title: string
}

export function ErrorPageShell({ code, description, icon, title }: ErrorPageShellProps) {
  return (
    <main className="relative flex min-h-0 flex-1 items-center overflow-hidden bg-background px-4 py-8 text-on-background sm:px-6 sm:py-12">
      <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 translate-x-1/3 -translate-y-1/3 rounded-full bg-primary-container/35 blur-3xl sm:h-96 sm:w-96" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-56 w-56 -translate-x-1/3 translate-y-1/3 rounded-full bg-tertiary-container/15 blur-3xl sm:h-80 sm:w-80" />

      <section className="relative mx-auto grid w-full max-w-5xl items-center gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="order-2 rounded-2xl border border-outline-variant/15 bg-surface-container-lowest/85 p-5 shadow-card backdrop-blur sm:p-8 lg:order-1">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-container text-primary-dim">
              <AppIcon filled name={icon} size={22} />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-on-surface-variant">
                Request status
              </p>
              <p className="mt-1 font-headline text-2xl font-extrabold text-on-surface">{code}</p>
            </div>
          </div>

          <div className="mt-8 space-y-3 border-t border-outline-variant/10 pt-6 text-sm leading-6 text-on-surface-variant">
            <p>
              The app is still running. Use the primary action to return to the best available page.
            </p>
            <p>
              If you arrived here after a form submission, your session or permissions may have
              changed.
            </p>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary-dim">
            Ledger Forge
          </p>
          <h1 className="mt-4 max-w-2xl font-headline text-4xl font-extrabold tracking-tight text-on-surface sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-on-surface-variant sm:text-lg">
            {description}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <ErrorHomeLink className="inline-flex items-center justify-center rounded-lg px-5 py-3 text-sm font-semibold text-on-primary shadow-sm milled-steel-gradient transition-all hover:opacity-95" />
            <span className="text-xs font-medium text-on-surface-variant">
              Routing adapts to your current access level.
            </span>
          </div>
        </div>
      </section>
    </main>
  )
}
