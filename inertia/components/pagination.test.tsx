import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

    fireEvent.click(screen.getByRole('button', { name: 'Précédent' }))
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }))

    expect(onPageChange).toHaveBeenNthCalledWith(1, 1)
    expect(onPageChange).toHaveBeenNthCalledWith(2, 3)
  })

  it('supports per-page changes when enabled', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()
    const onPerPageChange = vi.fn()
    render(
      <Pagination
        onPageChange={onPageChange}
        onPerPageChange={onPerPageChange}
        pagination={{ page: 1, perPage: 10, totalItems: 35, totalPages: 4 }}
      />
    )

    await user.click(screen.getByRole('combobox', { name: /Nombre d’éléments par page/i }))
    await user.click(await screen.findByRole('option', { name: '25' }))

    expect(onPerPageChange).toHaveBeenCalledWith(25)
    expect(onPageChange).not.toHaveBeenCalled()
  })
})
