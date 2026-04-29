import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./customers/customer_row_actions_menu', () => ({
  CustomerRowActionsMenu: () => null,
}))

vi.mock('./expenses/expense_row_actions_menu', () => ({
  ExpenseRowActionsMenu: () => null,
}))

vi.mock('./invoices/invoice_row_actions_menu', () => ({
  InvoiceRowActionsMenu: () => null,
}))

vi.mock('~/components/status_badge', () => ({
  StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}))

vi.mock('~/lib/invoices', () => ({
  invoiceDisplayStatus: () => 'draft',
}))

import { CustomerTable } from './customers/table'
import { ExpenseTable } from './expenses/table'
import { InvoiceTable } from './invoices/invoice_table'

describe('search highlighting in tables', () => {
  it('highlights matching customer fields', () => {
    const { container } = render(
      <CustomerTable
        canManageCustomers={false}
        items={[
          {
            address: '1 Main St',
            canDelete: true,
            company: 'Alpha Co',
            email: 'alpha@example.com',
            id: 'customer-1',
            invoiceCount: 1,
            name: 'Alice Alpha',
            note: 'Priority account',
            phone: '+33 6 00 00 00 01',
            totalInvoiced: 100,
          },
        ]}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onView={vi.fn()}
        processing={false}
        readOnly={true}
        searchQuery="alpha"
      />
    )

    expect(container.querySelectorAll('mark')).toHaveLength(3)
    expect(container.textContent).toContain('Alpha Co')
  })

  it('highlights matching expense fields', () => {
    const { container } = render(
      <ExpenseTable
        accountingReadOnly={true}
        items={[
          {
            amount: 250,
            category: 'Office',
            date: '2026-04-01',
            id: 'expense-1',
            label: 'Office rent',
            status: 'confirmed',
          },
        ]}
        onConfirm={vi.fn()}
        onDelete={vi.fn()}
        onOpen={vi.fn()}
        processingId={null}
        searchQuery="office"
      />
    )

    expect(container.querySelectorAll('mark')).toHaveLength(2)
    expect(container.textContent).toContain('Office rent')
  })

  it('highlights matching invoice fields', () => {
    const { container } = render(
      <InvoiceTable
        accountingReadOnly={true}
        invoices={[
          {
            customerCompanyName: 'Acme Corp',
            dueDate: '2026-04-01',
            id: 'invoice-1',
            invoiceNumber: 'ACME-001',
            totalInclTax: 1200,
          } as never,
        ]}
        onDeleteDraft={vi.fn()}
        onIssueInvoice={vi.fn()}
        onSelectInvoice={vi.fn()}
        saving={false}
        searchQuery="acme"
      />
    )

    expect(container.querySelectorAll('mark')).toHaveLength(2)
    expect(container.textContent).toContain('ACME-001')
  })
})
