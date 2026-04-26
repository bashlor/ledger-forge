import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { InvoiceDraftEditor } from './invoice_draft_editor'

vi.mock('~/components/app_icon', () => ({
  AppIcon: () => null,
}))

describe('InvoiceDraftEditor', () => {
  it('displays server-provided line and invoice totals', () => {
    render(
      <InvoiceDraftEditor
        accountingReadOnly={false}
        accountingReadOnlyMessage=""
        customers={[
          {
            company: 'Acme',
            email: 'billing@acme.test',
            id: 'customer-1',
            name: 'Alice',
            phone: '+33 6 00 00 00 00',
          },
        ]}
        effectiveCustomerId="customer-1"
        form={{
          customerId: 'customer-1',
          dueDate: '2026-04-30',
          issueDate: '2026-04-01',
          lines: [
            {
              description: 'Consulting',
              key: 'line-1',
              quantity: 2.5,
              unitPrice: 19.99,
              vatRate: 20,
            },
          ],
        }}
        formIsValid
        isCreating
        linePreviews={[
          {
            description: 'Consulting',
            lineTotalExclTax: 49.98,
            lineTotalInclTax: 59.98,
            lineVatAmount: 10,
            quantity: 2.5,
            unitPrice: 19.99,
            vatRate: 20,
          },
        ]}
        minDueDate="2026-04-01"
        onDeleteDraft={vi.fn()}
        onFormChange={vi.fn()}
        onIssueInvoice={vi.fn()}
        onLineAdd={vi.fn()}
        onLineRemove={vi.fn()}
        onLineUpdate={vi.fn()}
        onSaveDraft={vi.fn()}
        saving={false}
        selectedInvoice={null}
        totals={{
          subtotalExclTax: 49.98,
          totalInclTax: 59.98,
          totalVat: 10,
        }}
        totalsErrorMessage={null}
        vatRates={[0, 5.5, 10, 20]}
      />
    )

    expect(screen.getAllByText('€59.98')).toHaveLength(2)
    expect(screen.getByText('€49.98')).toBeInTheDocument()
    expect(screen.getByText('€10.00')).toBeInTheDocument()
  })
})
