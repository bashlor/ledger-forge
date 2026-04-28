import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import Settings from './settings'

const usePageMock = vi.hoisted(() => vi.fn())

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
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock('@inertiajs/react', () => ({
  Head: () => null,
  usePage: usePageMock,
}))

const defaultWorkspace = {
  id: 'ws',
  isAnonymousWorkspace: true,
  name: 'Pat User workspace',
  slug: 'pat-user-workspace',
}

const defaultPermissions = {
  canReadAccounting: true,
  canViewAuditTrail: false,
  canViewOrganization: true,
  canViewOverview: true,
}

function mockSharedPage(overrides?: {
  permissions?: typeof defaultPermissions
  workspace?: typeof defaultWorkspace | null
}) {
  usePageMock.mockReturnValue({
    props: {
      permissions: overrides?.permissions ?? defaultPermissions,
      workspace: overrides?.workspace === null ? undefined : (overrides?.workspace ?? defaultWorkspace),
    },
  })
}

describe('Settings page', () => {
  it('shows anonymous badge when session is anonymous', () => {
    mockSharedPage()

    render(
      <Settings
        user={{
          email: 'anon@example.com',
          image: null,
          isAnonymous: true,
          name: '',
        }}
      />,
    )

    expect(screen.getByText('Anonymous session')).toBeInTheDocument()
    expect(screen.getByText(/Anonymous sessions are read-only/i)).toBeInTheDocument()
  })

  it('shows workspace info when switching to Workspace section', async () => {
    const user = userEvent.setup()
    mockSharedPage()

    render(
      <Settings
        user={{
          email: 'anon@example.com',
          image: null,
          isAnonymous: true,
          name: '',
        }}
      />,
    )

    await user.click(screen.getByRole('button', { name: /^workspace$/i }))
    expect(screen.getByRole('heading', { name: 'Active workspace' })).toBeInTheDocument()
    expect(screen.getByText('Pat User workspace')).toBeInTheDocument()
    expect(screen.getByText('pat-user-workspace')).toBeInTheDocument()
  })

  it('shows profile and security actions when session is registered', async () => {
    const user = userEvent.setup()
    mockSharedPage({
      workspace: {
        id: 'ws',
        isAnonymousWorkspace: false,
        name: 'Pat User workspace',
        slug: 'pat-user-workspace',
      },
    })

    render(
      <Settings
        user={{
          email: 'jane@example.com',
          image: null,
          isAnonymous: false,
          name: 'Jane Doe',
        }}
      />,
    )

    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^security$/i }))
    expect(screen.getByRole('button', { name: /update password/i })).toBeInTheDocument()
  })
})
