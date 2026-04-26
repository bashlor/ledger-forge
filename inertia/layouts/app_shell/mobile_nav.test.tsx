import type { ReactNode } from 'react'

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { MobileNav } from './mobile_nav'

type MockLinkProps = Record<string, unknown> & {
  children: ReactNode
  href: string
}

vi.mock('@adonisjs/inertia/react', () => ({
  Link: ({ children, href, ...props }: MockLinkProps) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

describe('mobile nav', () => {
  it('renders the dev tools link when dev tools are enabled', () => {
    render(<MobileNav devToolsEnabled devToolsHref="/_dev" url="/dashboard" />)

    expect(screen.getByRole('link', { name: 'Dev' })).toHaveAttribute('href', '/_dev')
  })

  it('hides the dev tools link when dev tools are disabled', () => {
    render(<MobileNav devToolsEnabled={false} devToolsHref="/_dev" url="/dashboard" />)

    expect(screen.queryByRole('link', { name: 'Dev' })).not.toBeInTheDocument()
  })

  it('hides accounting nav links in dev operator mode', () => {
    render(
      <MobileNav
        devToolsEnabled
        devToolsHref="/_dev"
        showAccountingNav={false}
        url="/_dev/inspector"
      />
    )

    expect(screen.queryByRole('link', { name: 'Overview' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Dev' })).toBeInTheDocument()
  })
})
