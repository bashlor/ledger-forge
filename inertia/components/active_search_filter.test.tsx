import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ActiveSearchFilter } from './active_search_filter'

describe('ActiveSearchFilter', () => {
  it('renders nothing when the query is empty', () => {
    const { container } = render(<ActiveSearchFilter onClear={vi.fn()} query="   " />)

    expect(container).toBeEmptyDOMElement()
  })

  it('shows the active search state and triggers the clear action', () => {
    const onClear = vi.fn()
    render(<ActiveSearchFilter onClear={onClear} query="Existing Search" />)

    expect(screen.getByText('Active search')).toBeInTheDocument()
    expect(screen.getByText('Existing Search')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))

    expect(onClear).toHaveBeenCalledTimes(1)
  })
})
