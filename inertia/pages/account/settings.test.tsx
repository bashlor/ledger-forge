import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import Settings from './settings'

vi.mock('@adonisjs/inertia/react', () => ({
  Form: ({
    children,
    route,
  }: {
    children: ((props: { errors: Record<string, string> }) => React.ReactNode) | React.ReactNode
    route: string
  }) => (
    <form data-route={route}>
      {typeof children === 'function' ? children({ errors: {} }) : children}
    </form>
  ),
}))

describe('account settings page', () => {
  it('hides profile and password mutation controls for anonymous users', () => {
    render(
      <Settings
        user={{
          email: 'anonymous@example.com',
          image: null,
          isAnonymous: true,
          name: 'Anonymous User',
        }}
      />
    )

    expect(screen.getByText('Anonymous session')).toBeInTheDocument()
    expect(
      screen.getByText(/Anonymous accounts can browse the workspace but cannot change profile/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Anonymous mode keeps this page visible for inspection only/i)
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Update profile' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Change password' })).not.toBeInTheDocument()
  })
})
