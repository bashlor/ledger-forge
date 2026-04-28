import type { ReactNode } from 'react'

interface AuthPageShellProps {
  /** Optional left column on large screens (sign-in / sign-up marketing). */
  aside?: ReactNode
  children: ReactNode
  description: string
  footer?: ReactNode
  title: string
  /** When `aside` is set, use a wider form column (e.g. two-field rows on signup). */
  wideForm?: boolean
}

export function AuthPageShell({
  aside,
  children,
  description,
  footer,
  title,
  wideForm = false,
}: AuthPageShellProps) {
  const hasAside = Boolean(aside)

  const cardShellClass =
    'relative w-full overflow-hidden rounded-2xl border border-border-default bg-surface-container-lowest p-6 shadow-card-sm ring-1 ring-black/[0.04] sm:p-8 md:p-10'

  const card = (
    <div
      className={`${cardShellClass} ${hasAside ? '' : 'max-w-lg'} ${wideForm && hasAside ? 'lg:max-w-xl' : hasAside ? 'lg:max-w-md' : ''}`.trim()}
    >
      <header className="mb-6 sm:mb-8">
        <h1 className="font-headline text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 text-base leading-relaxed text-on-surface-variant">{description}</p>
      </header>

      {children}

      {footer ? (
        <footer className="mt-8 border-t border-border-hairline pt-6 text-center sm:mt-10">
          {footer}
        </footer>
      ) : null}
    </div>
  )

  return (
    <main
      className={`relative flex min-h-0 flex-1 flex-col bg-background px-4 py-6 text-on-background selection:bg-primary-container selection:text-on-primary-container sm:px-6 sm:py-8 lg:py-10 ${
        hasAside ? 'lg:min-h-[calc(100dvh-5rem)]' : ''
      }`.trim()}
    >
      {/* Canvas: mesh + soft glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,var(--color-primary-container),transparent_55%),radial-gradient(ellipse_70%_50%_at_100%_50%,rgba(79,70,229,0.06),transparent),radial-gradient(ellipse_60%_40%_at_0%_80%,rgba(5,150,105,0.05),transparent)]"
      />
      <div className="pointer-events-none fixed right-0 top-0 -z-10 h-[42vw] max-h-[520px] w-[42vw] max-w-[520px] translate-x-1/3 -translate-y-1/3 rounded-full bg-primary-container/35 blur-[100px]" />
      <div className="pointer-events-none fixed bottom-0 left-0 -z-10 h-[36vw] max-h-[420px] w-[36vw] max-w-[420px] -translate-x-1/3 translate-y-1/3 rounded-full bg-tertiary-container/25 blur-[90px]" />

      {hasAside ? (
        <div className="mx-auto grid w-full max-w-6xl flex-grow grid-cols-1 content-center gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-16 xl:gap-20">
          <aside className="hidden max-w-lg justify-self-end lg:block xl:max-w-xl">{aside}</aside>
          <div className="mx-auto w-full min-w-0 justify-self-center lg:mx-0 lg:justify-self-start">
            {card}
          </div>
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-lg flex-grow flex-col items-center justify-center">
          {card}
        </div>
      )}
    </main>
  )
}
