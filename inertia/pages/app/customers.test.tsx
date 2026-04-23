import type { ComponentProps } from 'react'

import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CustomerListDto } from '~/lib/types'
import type { FormErrors } from '~/types'

import CustomersPage from './customers'

const routerDeleteMock = vi.hoisted(() => vi.fn())
const routerGetMock = vi.hoisted(() => vi.fn())
const routerPostMock = vi.hoisted(() => vi.fn())
const routerPutMock = vi.hoisted(() => vi.fn())
const usePageMock = vi.hoisted(() => vi.fn())

vi.mock('@inertiajs/react', () => ({
  Head: () => null,
  router: {
    delete: routerDeleteMock,
    get: routerGetMock,
    post: routerPostMock,
    put: routerPutMock,
  },
  usePage: usePageMock,
}))

function buildCustomers(itemsOverride?: CustomerListDto['items']): CustomerListDto {
  return {
    items: itemsOverride ?? [
      {
        address: '1 rue Alpha, Paris',
        canDelete: true,
        company: 'Alpha Co',
        email: 'alpha@example.com',
        id: 'customer-alpha',
        invoiceCount: 0,
        name: 'Alice Alpha',
        note: 'Priority account',
        phone: '+33 6 00 00 00 01',
        totalInvoiced: 0,
      },
      {
        address: '2 rue Beta, Lyon',
        canDelete: false,
        company: 'Beta Co',
        deleteBlockReason: 'This customer is referenced by one or more invoices.',
        email: 'beta@example.com',
        id: 'customer-beta',
        invoiceCount: 3,
        name: 'Bob Beta',
        note: undefined,
        phone: '+33 6 00 00 00 02',
        totalInvoiced: 1240,
      },
    ],
    pagination: {
      page: 2,
      perPage: 25,
      totalItems: 40,
      totalPages: 2,
    },
    summary: {
      linkedCustomers: 1,
      totalCount: 2,
      totalInvoiced: 1240,
    },
  }
}

function buildProps(
  overrides: Partial<ComponentProps<typeof CustomersPage>> = {}
): ComponentProps<typeof CustomersPage> {
  return {
    accountingReadOnly: false,
    accountingReadOnlyMessage: 'Accounting is in read-only mode.',
    canManageCustomers: true,
    customers: buildCustomers(),
    devTools: {
      accessHref: '/_dev',
      canAccess: false,
      enabled: false,
    },
    errors: {},
    filters: { search: '  Existing Search  ' },
    flash: { notification: null },
    user: {
      email: 'pat@example.com',
      fullName: 'Pat User',
      id: 'user-1',
      image: null,
      initials: 'PU',
      isAnonymous: false,
    },
    workspace: undefined,
    ...overrides,
  }
}

function renderPage(
  overrides: Partial<ComponentProps<typeof CustomersPage>> = {},
  errors: FormErrors = {}
) {
  setPageErrors(errors)
  return render(<CustomersPage {...buildProps(overrides)} />)
}

function setPageErrors(errors: FormErrors = {}) {
  usePageMock.mockImplementation(() => ({
    props: { errors },
    url: '/customers',
  }))
}

describe('customers page', () => {
  beforeEach(() => {
    routerDeleteMock.mockReset()
    routerGetMock.mockReset()
    routerPostMock.mockReset()
    routerPutMock.mockReset()
    usePageMock.mockReset()
    vi.stubGlobal('confirm', vi.fn(() => true))
  })

  it('submits customer creation with trimmed contact fields and preserved query params', () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'New customer' }))
    fireEvent.change(screen.getByLabelText('Company'), { target: { value: 'Gamma Co' } })
    fireEvent.change(screen.getByLabelText('Address'), { target: { value: '3 rue Gamma, Lille' } })
    fireEvent.change(screen.getByLabelText('Contact'), { target: { value: 'Gina Gamma' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: '  gamma@example.com  ' } })
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(routerPostMock).toHaveBeenCalledWith(
      '/customers',
      expect.objectContaining({
        address: '3 rue Gamma, Lille',
        company: 'Gamma Co',
        email: 'gamma@example.com',
        name: 'Gina Gamma',
        page: 2,
        perPage: 25,
        phone: undefined,
        search: 'Existing Search',
      }),
      expect.objectContaining({
        onFinish: expect.any(Function),
        onStart: expect.any(Function),
        onSuccess: expect.any(Function),
        preserveScroll: true,
      })
    )
  })

  it('opens edit mode from the table keyboard interaction and submits updates', () => {
    renderPage()

    fireEvent.keyDown(screen.getByRole('row', { name: /Alpha Co/i }), { key: 'Enter' })

    expect(screen.getByRole('dialog', { name: 'Edit Alpha Co' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Company'), { target: { value: 'Alpha Co Updated' } })
    fireEvent.click(screen.getByRole('button', { name: 'Update' }))

    expect(routerPutMock).toHaveBeenCalledWith(
      '/customers/customer-alpha',
      expect.objectContaining({
        company: 'Alpha Co Updated',
        page: 2,
        perPage: 25,
        search: 'Existing Search',
      }),
      expect.objectContaining({
        preserveScroll: true,
      })
    )
  })

  it('hides mutation controls when the user cannot manage customers', () => {
    renderPage({ canManageCustomers: false })

    expect(screen.queryByRole('button', { name: 'New customer' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('Alpha Co'))

    expect(screen.queryByRole('dialog', { name: 'Edit Alpha Co' })).not.toBeInTheDocument()
    expect(routerPostMock).not.toHaveBeenCalled()
    expect(routerPutMock).not.toHaveBeenCalled()
    expect(routerDeleteMock).not.toHaveBeenCalled()
  })

  it('shows read-only feedback and blocks customer mutations', () => {
    renderPage({ accountingReadOnly: true })

    expect(screen.getAllByText('Accounting is in read-only mode.')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'New customer' })).toBeDisabled()
    expect(screen.getAllByRole('button', { name: 'Delete' })[0]).toBeDisabled()

    fireEvent.click(screen.getByText('Alpha Co'))

    expect(screen.queryByRole('dialog', { name: 'Edit Alpha Co' })).not.toBeInTheDocument()
    expect(routerPostMock).not.toHaveBeenCalled()
    expect(routerPutMock).not.toHaveBeenCalled()
    expect(routerDeleteMock).not.toHaveBeenCalled()
  })

  it('confirms deletions and preserves active query params', () => {
    renderPage()

    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0])

    expect(globalThis.confirm).toHaveBeenCalledWith('Delete customer "Alpha Co"?')
    expect(routerDeleteMock).toHaveBeenCalledWith(
      '/customers/customer-alpha',
      expect.objectContaining({
        data: {
          page: 2,
          perPage: 25,
          search: 'Existing Search',
        },
        onFinish: expect.any(Function),
        onStart: expect.any(Function),
        preserveScroll: true,
      })
    )
  })

  it('applies local filters without hitting the server and shows the filtered empty state', () => {
    renderPage({
      customers: buildCustomers([
        {
          address: '9 rue Solo, Marseille',
          canDelete: true,
          company: 'Solo Co',
          email: 'solo@example.com',
          id: 'customer-solo',
          invoiceCount: 0,
          name: 'Sam Solo',
          phone: '+33 6 00 00 00 09',
          totalInvoiced: 0,
        },
      ]),
    })

    fireEvent.change(screen.getByLabelText('Filter customers'), {
      target: { value: 'with_invoices' },
    })

    expect(screen.getByText('No customers match the current filters on this page.')).toBeInTheDocument()
    expect(routerGetMock).not.toHaveBeenCalled()
  })

  it('submits trimmed search terms through the customers query refresh', () => {
    renderPage()

    fireEvent.change(screen.getByLabelText('Search customers'), { target: { value: '  Beta  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    expect(routerGetMock).toHaveBeenCalledWith(
      '/customers',
      { perPage: 25, search: 'Beta' },
      { only: ['customers', 'filters'], preserveScroll: true, replace: true }
    )
  })

  it('opens the drawer when customer validation errors are present', () => {
    renderPage({}, { company: 'Company is required.' })

    expect(screen.getByRole('dialog', { name: 'Create customer' })).toBeInTheDocument()
    expect(screen.getByText('Company is required.')).toBeInTheDocument()
  })

  it('keeps the edit context visible when validation errors arrive after opening the drawer', () => {
    const props = buildProps()
    setPageErrors()
    const { rerender } = render(<CustomersPage {...props} />)

    fireEvent.click(screen.getByText('Alpha Co'))
    expect(screen.getByRole('dialog', { name: 'Edit Alpha Co' })).toBeInTheDocument()

    setPageErrors({ email: 'Email is invalid.' })
    rerender(<CustomersPage {...props} />)

    expect(screen.getByRole('dialog', { name: 'Edit Alpha Co' })).toBeInTheDocument()
    expect(screen.getByText('Email is invalid.')).toBeInTheDocument()
  })
})
