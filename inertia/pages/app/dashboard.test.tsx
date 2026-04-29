import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { DashboardDto } from '~/lib/types'

import DashboardPage from './dashboard'

vi.mock('@adonisjs/inertia/react', () => ({
  Link: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@inertiajs/react', () => ({
  Head: () => null,
}))

vi.mock('~/components/date_scope_provider', () => ({
  useDateScope: () => ({
    scope: {
      endDate: '2026-04-30',
      label: 'April 2026',
      mode: 'month',
      startDate: '2026-04-01',
    },
  }),
}))

vi.mock('~/components/date_scope_summary', () => ({
  DateScopeSummary: () => <div>April 2026</div>,
}))

describe('DashboardPage', () => {
  it('links recent invoices to the selected invoice in the invoices screen', () => {
    const dashboard: DashboardDto = {
      recentInvoices: [
        {
          customerCompanyName: 'Acme Corp',
          date: '2026-04-12',
          dueDate: '2026-04-30',
          id: 'invoice-123',
          invoiceNumber: 'INV-2026-001',
          status: 'issued',
          totalInclTax: 1200,
        },
      ],
      summary: {
        profit: 800,
        totalCollected: 400,
        totalExpenses: 200,
        totalRevenue: 1000,
      },
    }

    render(<DashboardPage {...({ dashboard } as React.ComponentProps<typeof DashboardPage>)} />)

    expect(screen.getByRole('link', { name: 'Open invoice INV-2026-001' })).toHaveAttribute(
      'href',
      '/invoices?endDate=2026-04-30&invoice=invoice-123&startDate=2026-04-01'
    )
  })
})
