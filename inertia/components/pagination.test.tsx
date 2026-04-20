import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Pagination } from './pagination'

describe('Pagination', () => {
  it('triggers page navigation callbacks', () => {
    const onPageChange = vi.fn()
    render(
      <Pagination
        onPageChange={onPageChange}
        pagination={{ page: 2, perPage: 10, totalItems: 35, totalPages: 4 }}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Previous' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(onPageChange).toHaveBeenNthCalledWith(1, 1)
    expect(onPageChange).toHaveBeenNthCalledWith(2, 3)
  })

  it('supports per-page changes when enabled', () => {
    const onPageChange = vi.fn()
    const onPerPageChange = vi.fn()
    render(
      <Pagination
        onPageChange={onPageChange}
        onPerPageChange={onPerPageChange}
        pagination={{ page: 1, perPage: 10, totalItems: 35, totalPages: 4 }}
      />
    )

    fireEvent.change(screen.getByLabelText('Items per page'), { target: { value: '25' } })

    expect(onPerPageChange).toHaveBeenCalledWith(25)
    expect(onPageChange).not.toHaveBeenCalled()
  })
})
