import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import Settings from './settings'

const usePageMock = vi.hoisted(() =>
  vi.fn(() => ({
    props: {
      workspace: null as null | {
        id: string
        isAnonymousWorkspace: boolean
        name: string
        slug: string
      },
    },
    url: '/account',
  }))
)

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

vi.mock('@inertiajs/react', () => ({
  usePage: usePageMock,
}))

describe('account settings page', () => {
  beforeEach(() => {
    usePageMock.mockImplementation(() => ({
      props: { workspace: null },
      url: '/account',
    }))
  })

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

  it('shows active workspace summary when workspace prop is present', () => {
    usePageMock.mockImplementation(() => ({
      props: {
        workspace: {
          id: 'org-1',
          isAnonymousWorkspace: false,
          name: 'Pat User workspace',
          slug: 'ws-abc123',
        },
      },
      url: '/account',
    }))

    render(
      <Settings
        user={{
          email: 'pat@example.com',
          image: null,
          isAnonymous: false,
          name: 'Pat User',
        }}
      />
    )

    expect(screen.getByText('Active workspace')).toBeInTheDocument()
    expect(screen.getByText('Pat User workspace')).toBeInTheDocument()
    expect(screen.getByText('ws-abc123')).toBeInTheDocument()
  })
})
