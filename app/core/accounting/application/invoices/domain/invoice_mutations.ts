import type {
  CustomerSnapshotSource,
  InvoiceCustomerSnapshot,
  NormalizedSaveInvoiceDraftInput,
} from '../types.js'

import { calculateLine, calculateTotals, fromDisplayUnits } from './invoice_calculations.js'

type InvoiceInsert = (typeof import('#core/accounting/drizzle/schema'))['invoices']['$inferInsert']
type InvoiceLineInsert =
  (typeof import('#core/accounting/drizzle/schema'))['invoiceLines']['$inferInsert']

export function buildDraftInvoiceLinesMutation(lines: NormalizedSaveInvoiceDraftInput['lines']): {
  lineValues: Omit<InvoiceLineInsert, 'id' | 'invoiceId'>[]
  totals: Pick<InvoiceInsert, 'subtotalExclTaxCents' | 'totalInclTaxCents' | 'totalVatCents'>
} {
  const normalizedLines = lines.map(fromDisplayUnits)
  const calculatedLines = normalizedLines.map(calculateLine)

  return {
    lineValues: normalizedLines.map((line, index) => ({
      description: line.description,
      lineNumber: index + 1,
      quantityCents: line.quantityHundredths,
      unitPriceCents: line.unitPriceCents,
      vatRateCents: line.vatRateCents,
      ...calculatedLines[index],
    })),
    totals: calculateTotals(calculatedLines),
  }
}

export function buildDraftInvoiceMutation(input: {
  customer: CustomerSnapshotSource
  customerId: string
  dueDate: string
  issueDate: string
  issuedCompanyAddress: string
  issuedCompanyName: string
  totals: Pick<InvoiceInsert, 'subtotalExclTaxCents' | 'totalInclTaxCents' | 'totalVatCents'>
}): Pick<
  InvoiceInsert,
  | 'customerCompanyAddressSnapshot'
  | 'customerCompanyName'
  | 'customerCompanySnapshot'
  | 'customerEmailSnapshot'
  | 'customerId'
  | 'customerPhoneSnapshot'
  | 'customerPrimaryContactSnapshot'
  | 'dueDate'
  | 'issueDate'
  | 'issuedCompanyAddress'
  | 'issuedCompanyName'
  | 'subtotalExclTaxCents'
  | 'totalInclTaxCents'
  | 'totalVatCents'
> {
  return {
    customerCompanyName: input.customer.company,
    customerId: input.customerId,
    dueDate: input.dueDate,
    issueDate: input.issueDate,
    issuedCompanyAddress: input.issuedCompanyAddress,
    issuedCompanyName: input.issuedCompanyName,
    ...buildCustomerSnapshot(input.customer),
    ...input.totals,
  }
}

export function buildInvoiceIssueMutation(input: {
  customer: CustomerSnapshotSource
  issuedCompanyAddress: string
  issuedCompanyName: string
}): Pick<
  InvoiceInsert,
  | 'customerCompanyAddressSnapshot'
  | 'customerCompanyName'
  | 'customerCompanySnapshot'
  | 'customerEmailSnapshot'
  | 'customerPhoneSnapshot'
  | 'customerPrimaryContactSnapshot'
  | 'issuedCompanyAddress'
  | 'issuedCompanyName'
> {
  return {
    customerCompanyName: input.customer.company,
    issuedCompanyAddress: input.issuedCompanyAddress,
    issuedCompanyName: input.issuedCompanyName,
    ...buildCustomerSnapshot(input.customer),
  }
}

function buildCustomerSnapshot(customer: CustomerSnapshotSource): InvoiceCustomerSnapshot {
  return {
    customerCompanyAddressSnapshot: customer.address,
    customerCompanySnapshot: customer.company,
    customerEmailSnapshot: customer.email,
    customerPhoneSnapshot: customer.phone,
    customerPrimaryContactSnapshot: customer.name,
  }
}
