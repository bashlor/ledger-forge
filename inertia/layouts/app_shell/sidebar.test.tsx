import type { ReactNode } from 'react'

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AppSidebar } from './sidebar'

type MockLinkProps = Record<string, unknown> & {
  children: ReactNode
  href: string
}

vi.mock('@adonisjs/inertia/react', () => ({
  Form: ({ children, ...props }: { children: ReactNode }) => <form {...props}>{children}</form>,
  Link: ({ children, href, ...props }: MockLinkProps) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

describe('app sidebar', () => {
  it('renders only the nav links passed by the shell permissions filter', () => {
    render(
      <AppSidebar
        devToolsEnabled={false}
        devToolsHref="/_dev"
        navLinks={[
          { href: '/customers', icon: 'business', label: 'Customers' },
          { href: '/expenses', icon: 'shopping_bag', label: 'Expenses' },
        ]}
        showAccountingNav
        url="/customers"
      />
    )

    expect(screen.queryByRole('link', { name: 'Overview' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Organization' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Customers' })).toHaveAttribute('href', '/customers')
    expect(screen.getByRole('link', { name: 'Expenses' })).toHaveAttribute('href', '/expenses')
  })
})
