import type { ReactNode } from 'react'

import { Caption, Panel } from './ui'

interface AuthPageShellProps {
  children: ReactNode
  description: string
  footer?: ReactNode
  title: string
}

export function AuthPageShell({ children, description, footer, title }: AuthPageShellProps) {
  return (
    <main className="relative flex min-h-0 flex-1 flex-col bg-background px-4 py-4 text-on-background selection:bg-primary-container selection:text-on-primary-container sm:px-6 sm:py-6 lg:py-8">
      <div className="pointer-events-none fixed right-0 top-0 -z-10 h-[40vw] w-[40vw] translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-container/20 blur-[120px]" />
      <div className="pointer-events-none fixed bottom-0 left-0 -z-10 h-[30vw] w-[30vw] -translate-x-1/2 translate-y-1/2 rounded-full bg-tertiary-container/10 blur-[100px]" />

      <div className="mx-auto flex w-full max-w-[440px] flex-grow flex-col items-center justify-center">
        <Panel
          as="div"
          className="relative w-full overflow-hidden p-5 shadow-ambient sm:p-6 md:p-8"
        >
          <div className="absolute left-0 top-0 h-1 w-full milled-steel-gradient opacity-80" />
          <header className="mb-5">
            <h1 className="font-headline text-xl font-bold text-on-surface">{title}</h1>
            <Caption className="mt-1">{description}</Caption>
          </header>

          {children}

          {footer ? (
            <footer className="ghost-border mt-5 pt-4 text-center sm:mt-6">{footer}</footer>
          ) : null}
        </Panel>
      </div>
    </main>
  )
}
