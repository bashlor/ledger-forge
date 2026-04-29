import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DateScopeControls } from './date_scope_controls'
import { DateScopeProvider } from './date_scope_provider'

vi.mock('~/components/app_icon', () => ({
  AppIcon: () => null,
}))

describe('DateScopeControls', () => {
  it('opens the period picker from the topbar trigger', () => {
    render(
      <DateScopeProvider>
        <DateScopeControls />
      </DateScopeProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open date picker' }))

    expect(screen.getByRole('dialog', { name: 'Select period' })).toBeInTheDocument()
    expect(screen.getByText('Select period')).toBeInTheDocument()
    expect(screen.getByText('Custom range')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Jan' })).toBeInTheDocument()
    expect(screen.queryByText('Exact month')).not.toBeInTheDocument()
  })
})
