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

const defaultUser = {
  email: 'anon@example.com',
  fullName: '',
  id: 'user-anon',
  image: null,
  initials: 'AN',
  isAnonymous: true,
  isDevOperator: false,
}

function mockSharedPage(overrides?: {
  permissions?: typeof defaultPermissions
  user?: null | typeof defaultUser
  workspace?: null | typeof defaultWorkspace
}) {
  usePageMock.mockReturnValue({
    props: {
      permissions: overrides?.permissions ?? defaultPermissions,
      user: overrides?.user === null ? undefined : (overrides?.user ?? defaultUser),
      workspace:
        overrides?.workspace === null ? undefined : (overrides?.workspace ?? defaultWorkspace),
    },
  })
}

describe('Settings page', () => {
  it('shows anonymous badge when session is anonymous', () => {
    mockSharedPage()

    render(<Settings activeWorkspaceRole={null} />)

    expect(screen.getByText('Anonymous session')).toBeInTheDocument()
    expect(screen.getByText(/Anonymous sessions are read-only/i)).toBeInTheDocument()
  })

  it('shows workspace info when switching to Workspace section', async () => {
    const user = userEvent.setup()
    mockSharedPage()

    render(<Settings activeWorkspaceRole={null} />)

    await user.click(screen.getByRole('button', { name: /^workspace$/i }))
    expect(screen.getByRole('heading', { name: 'Active workspace' })).toBeInTheDocument()
    expect(screen.getByText('Pat User workspace')).toBeInTheDocument()
    expect(screen.getByText('pat-user-workspace')).toBeInTheDocument()
  })

  it('filters settings navigation from user permissions and account type', () => {
    mockSharedPage({
      permissions: {
        canReadAccounting: false,
        canViewAuditTrail: false,
        canViewOrganization: false,
        canViewOverview: false,
      },
    })

    render(<Settings activeWorkspaceRole={null} />)

    expect(screen.getByRole('button', { name: /^profile$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^security$/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^workspace$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /billing/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^danger zone$/i })).not.toBeInTheDocument()
  })

  it('shows profile and security actions when session is registered', async () => {
    const user = userEvent.setup()
    mockSharedPage({
      user: {
        email: 'jane@example.com',
        fullName: 'Jane Doe',
        id: 'user-jane',
        image: null,
        initials: 'JD',
        isAnonymous: false,
        isDevOperator: false,
      },
      workspace: {
        id: 'ws',
        isAnonymousWorkspace: false,
        name: 'Pat User workspace',
        slug: 'pat-user-workspace',
      },
    })

    render(<Settings activeWorkspaceRole="owner" />)

    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
    expect(screen.getByText('Registered account')).toBeInTheDocument()
    expect(screen.getByText('Owner')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^security$/i }))
    expect(screen.getByRole('button', { name: /update password/i })).toBeInTheDocument()
  })
})
