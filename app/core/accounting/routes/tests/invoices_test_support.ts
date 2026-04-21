import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { type InvoiceService } from '#core/accounting/application/invoices/index'
import { auditEvents, customers, invoices, journalEntries } from '#core/accounting/drizzle/schema'

import {
  seedTestOrganization,
  TEST_TENANT_ID,
} from '../../../../../tests/helpers/testcontainers_db.js'
import {
  authCookie,
  bindAccountingAuth,
  resetAccountingAuthContext,
  setAccountingAuthContext,
  TEST_ACCOUNTING_ACCESS_CONTEXT,
  TEST_ACCOUNTING_USER_EMAIL,
  TEST_ACCOUNTING_USER_ID,
  TEST_ACCOUNTING_USER_PUBLIC_ID,
} from './accounting_test_support.js'

export const TEST_CUSTOMER_ID = 'test-customer-for-invoices'
export const SECOND_CUSTOMER_ID = 'test-customer-for-invoices-2'
type InvoiceAuthContext = Parameters<typeof setAccountingAuthContext>[0]

export const TEST_INVOICE_USER_ID = TEST_ACCOUNTING_USER_ID
export const TEST_INVOICE_USER_PUBLIC_ID = TEST_ACCOUNTING_USER_PUBLIC_ID
export const TEST_INVOICE_USER_EMAIL = TEST_ACCOUNTING_USER_EMAIL

export { seedTestOrganization }

export function addDaysDateOnlyUtc(value: string, days: number): string {
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + days))
  return dateOnlyUtcFromDate(date)
}

export { authCookie, TEST_ACCOUNTING_ACCESS_CONTEXT }

export function bindInvoiceAuth() {
  bindAccountingAuth()
}

export async function createDraftViaHttp(db: PostgresJsDatabase<any>, client: any) {
  const issueDate = dateOffsetFromTodayUtc(0)
  const dueDate = dateOffsetFromTodayUtc(30)

  await client.post('/invoices').header('cookie', authCookie()).redirects(0).form({
    customerId: TEST_CUSTOMER_ID,
    dueDate,
    issueDate,
    'lines[0][description]': 'Consulting services',
    'lines[0][quantity]': 2,
    'lines[0][unitPrice]': 500,
    'lines[0][vatRate]': 20,
  })

  const [draft] = await db.select().from(invoices)
  return draft
}

export async function createDraftViaService(
  service: InvoiceService,
  options: {
    customerId?: string
    description?: string
    dueDate?: string
    issueDate: string
  }
) {
  const dueDate = options.dueDate ?? '2099-12-31'
  return service.createDraft(
    {
      customerId: options.customerId ?? TEST_CUSTOMER_ID,
      dueDate,
      issueDate: options.issueDate,
      lines: [
        {
          description: options.description ?? `Draft ${options.issueDate}`,
          quantity: 1,
          unitPrice: 100,
          vatRate: 20,
        },
      ],
    },
    TEST_ACCOUNTING_ACCESS_CONTEXT
  )
}

export function dateOffsetFromDateUtc(date: Date, days: number): string {
  const utcDate = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days)
  )
  return dateOnlyUtcFromDate(utcDate)
}

export function dateOffsetFromTodayUtc(days: number): string {
  return dateOffsetFromDateUtc(new Date(), days)
}

export function dateOnlyUtcFromDate(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function inertiaGet(client: any, url: string) {
  return client
    .get(url)
    .header('cookie', authCookie())
    .header('x-inertia', 'true')
    .header('x-inertia-version', '1')
}

export function inertiaHeaders(request: any) {
  request.header('x-inertia', 'true')
  request.header('x-inertia-version', '1')
  return request
}

export function inertiaProps(response: any) {
  return response.body().props as any
}

export function issuePayload() {
  return {
    issuedCompanyAddress: "10 rue de l'Emission\n75002 Paris",
    issuedCompanyName: 'Issued Company Name',
  }
}

export function resetInvoiceAuthContext() {
  resetAccountingAuthContext()
}

export async function resetInvoiceFixtures(db: PostgresJsDatabase<any>) {
  await db.delete(auditEvents)
  await db.delete(journalEntries)
  await db.delete(invoices)
  await db.delete(customers)

  await db.insert(customers).values({
    address: '10 rue de la Paix, 75002 Paris',
    company: 'Test Company SAS',
    email: 'contact@testco.fr',
    id: TEST_CUSTOMER_ID,
    name: 'Alice Martin',
    organizationId: TEST_TENANT_ID,
    phone: '+33 6 12 34 56 78',
  })

  await db.insert(customers).values({
    address: '42 avenue des Clients, 69000 Lyon',
    company: 'Second Company SARL',
    email: 'second@testco.fr',
    id: SECOND_CUSTOMER_ID,
    name: 'Bob Martin',
    organizationId: TEST_TENANT_ID,
    phone: '+33 6 98 76 54 32',
  })
}

export function setInvoiceAuthContext(overrides: Partial<InvoiceAuthContext> = {}) {
  setAccountingAuthContext(overrides)
}
