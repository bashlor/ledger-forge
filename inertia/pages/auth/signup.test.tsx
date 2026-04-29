import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import Signup from './signup'

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
}))

describe('signup page', () => {
  it('uses semantic input types for account credentials', () => {
    render(<Signup />)

    expect(screen.getByLabelText('Full name')).toHaveAttribute('type', 'text')
    expect(screen.getByLabelText('Email address')).toHaveAttribute('type', 'email')
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
    expect(screen.getByLabelText('Confirm password')).toHaveAttribute('type', 'password')
  })
})
