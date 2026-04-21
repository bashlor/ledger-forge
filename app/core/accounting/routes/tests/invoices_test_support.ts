import type { AccountingAccessContext } from '#core/accounting/application/support/access_context'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { type InvoiceService } from '#core/accounting/application/invoices/index'
import { auditEvents, customers, invoices, journalEntries } from '#core/accounting/drizzle/schema'
import { AUTH_SESSION_TOKEN_COOKIE_NAME } from '#core/user_management/auth_session_cookie'
import {
  AuthenticationPort,
  type AuthProviderUser,
  type AuthResult,
} from '#core/user_management/domain/authentication'
import app from '@adonisjs/core/services/app'

import {
  seedTestOrganization,
  TEST_TENANT_ID,
} from '../../../../../tests/helpers/testcontainers_db.js'

export const TEST_CUSTOMER_ID = 'test-customer-for-invoices'
export const SECOND_CUSTOMER_ID = 'test-customer-for-invoices-2'
export const TEST_INVOICE_USER_ID = 'user_test_invoices'
export const TEST_INVOICE_USER_PUBLIC_ID = 'pub_user_test_invoices'
export const TEST_INVOICE_USER_EMAIL = 'test@example.com'

type InvoiceAuthContext = {
  email: string
  organizationId: string
  token: string
  userId: string
  userPublicId: string
}

let authContext: InvoiceAuthContext = {
  email: TEST_INVOICE_USER_EMAIL,
  organizationId: TEST_TENANT_ID,
  token: 'test_session_token_invoices',
  userId: TEST_INVOICE_USER_ID,
  userPublicId: TEST_INVOICE_USER_PUBLIC_ID,
}
const defaultAuthContext: InvoiceAuthContext = { ...authContext }

function fakeSessionFromContext(context: InvoiceAuthContext): AuthResult {
  const user = fakeUserFromContext(context)
  return {
    session: {
      activeOrganizationId: context.organizationId,
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
      token: context.token,
      userId: user.id,
    },
    user,
  }
}

function fakeUserFromContext(context: InvoiceAuthContext): AuthProviderUser {
  return {
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    email: context.email,
    emailVerified: true,
    id: context.userId,
    image: null,
    isAnonymous: false,
    name: 'Test User',
    publicId: context.userPublicId,
  }
}

export const TEST_ACCOUNTING_ACCESS_CONTEXT: AccountingAccessContext = {
  actorId: TEST_INVOICE_USER_ID,
  isAnonymous: false,
  requestId: 'test',
  tenantId: TEST_TENANT_ID,
}

export { seedTestOrganization }

class FakeAuth extends AuthenticationPort {
  private readonly session: AuthResult
  private readonly user: AuthProviderUser

  constructor(session: AuthResult) {
    super()
    this.session = session
    this.user = session.user
  }

  async changePassword(): Promise<void> {}
  getOAuthUrl(): string {
    return ''
  }
  async getSession(token: null | string): Promise<AuthResult | null> {
    return token === this.session.session.token ? this.session : null
  }
  async getUserById(): Promise<AuthProviderUser | null> {
    return this.user
  }
  async requestPasswordReset(): Promise<void> {}
  async resetPassword(): Promise<void> {}
  async sendVerificationEmail(): Promise<void> {}
  async signIn(): Promise<AuthResult> {
    return this.session
  }
  async signInAnonymously(): Promise<AuthResult> {
    return this.session
  }
  async signOut(): Promise<void> {}
  async signUp(): Promise<AuthResult> {
    return this.session
  }
  async updateUser(): Promise<AuthProviderUser> {
    return this.user
  }
  async validateSession(): Promise<AuthResult> {
    return this.session
  }
  async verifyEmail(): Promise<void> {}
}

export function addDaysDateOnlyUtc(value: string, days: number): string {
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + days))
  return dateOnlyUtcFromDate(date)
}

export function authCookie() {
  return `${AUTH_SESSION_TOKEN_COOKIE_NAME}=${authContext.token}`
}

export function bindInvoiceAuth() {
  const auth = new FakeAuth(fakeSessionFromContext(authContext))
  app.container.bindValue(AuthenticationPort, auth)
  app.container.bindValue('authAdapter', auth)
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
  authContext = { ...defaultAuthContext }
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
  authContext = {
    ...authContext,
    ...overrides,
  }
}
