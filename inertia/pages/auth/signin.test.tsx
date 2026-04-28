import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import Signin from './signin'

const routerPostMock = vi.hoisted(() => vi.fn())

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
  router: {
    post: routerPostMock,
  },
}))

describe('signin page', () => {
  it('shows anonymous sign-in only when enabled', () => {
    render(<Signin allowAnonymousAuth />)

    expect(screen.getByRole('button', { name: 'Continue without an account' })).toBeInTheDocument()
  })

  it('hides anonymous sign-in when disabled', () => {
    render(<Signin allowAnonymousAuth={false} />)

    expect(
      screen.queryByRole('button', { name: 'Continue without an account' })
    ).not.toBeInTheDocument()
  })

  it('posts to the anonymous sign-in route when selected', () => {
    render(<Signin allowAnonymousAuth />)

    fireEvent.click(screen.getByRole('button', { name: 'Continue without an account' }))

    expect(routerPostMock).toHaveBeenCalledWith('/signin/anonymous')
  })
})
