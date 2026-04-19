import { Form } from '@adonisjs/inertia/react'
import { usePage } from '@inertiajs/react'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import Settings from './settings'

vi.mock('@inertiajs/react', () => ({
  usePage: vi.fn(),
}))

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
  beforeEach(() => {
    vi.mocked(usePage).mockReset()
  })

  it('hides profile and password mutation controls for anonymous users', () => {
    vi.mocked(usePage).mockReturnValue({
      props: {
        user: { isAnonymous: true },
      },
    } as never)

    render(
      <Settings
        user={{
          email: 'anonymous@example.com',
          image: null,
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
