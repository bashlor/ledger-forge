import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { type InvoiceService } from '#core/accounting/application/invoices/index'
import { SYSTEM_ACCOUNTING_ACCESS_CONTEXT } from '#core/accounting/application/support/access_context'
import { customers, invoices, journalEntries } from '#core/accounting/drizzle/schema'
import { AUTH_SESSION_TOKEN_COOKIE_NAME } from '#core/user_management/auth_session_cookie'
import {
  AuthenticationPort,
  type AuthProviderUser,
  type AuthResult,
} from '#core/user_management/domain/authentication'
import app from '@adonisjs/core/services/app'

export const TEST_CUSTOMER_ID = 'test-customer-for-invoices'
export const SECOND_CUSTOMER_ID = 'test-customer-for-invoices-2'

const fakeUser: AuthProviderUser = {
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  email: 'test@example.com',
  emailVerified: true,
  id: 'user_test_invoices',
  image: null,
  isAnonymous: false,
  name: 'Test User',
}

const fakeSession: AuthResult = {
  session: {
    activeOrganizationId: null,
    expiresAt: new Date('2030-01-01T00:00:00.000Z'),
    token: 'test_session_token_invoices',
    userId: fakeUser.id,
  },
  user: fakeUser,
}

class FakeAuth extends AuthenticationPort {
  async changePassword(): Promise<void> {}
  getOAuthUrl(): string {
    return ''
  }
  async getSession(token: null | string): Promise<AuthResult | null> {
    return token === fakeSession.session.token ? fakeSession : null
  }
  async getUserById(): Promise<AuthProviderUser | null> {
    return fakeUser
  }
  async requestPasswordReset(): Promise<void> {}
  async resetPassword(): Promise<void> {}
  async sendVerificationEmail(): Promise<void> {}
  async signIn(): Promise<AuthResult> {
    return fakeSession
  }
  async signInAnonymously(): Promise<AuthResult> {
    return fakeSession
  }
  async signOut(): Promise<void> {}
  async signUp(): Promise<AuthResult> {
    return fakeSession
  }
  async updateUser(): Promise<AuthProviderUser> {
    return fakeUser
  }
  async validateSession(): Promise<AuthResult> {
    return fakeSession
  }
  async verifyEmail(): Promise<void> {}
}

export function authCookie() {
  return `${AUTH_SESSION_TOKEN_COOKIE_NAME}=${fakeSession.session.token}`
}

export function bindInvoiceAuth() {
  const auth = new FakeAuth()
  app.container.bindValue(AuthenticationPort, auth)
  app.container.bindValue('authAdapter', auth)
}

export async function createDraftViaHttp(db: PostgresJsDatabase<any>, client: any) {
  const today = new Date()
  const issueDate = today.toISOString().slice(0, 10)
  const due = new Date(today)
  due.setDate(today.getDate() + 30)
  const dueDate = due.toISOString().slice(0, 10)

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
    SYSTEM_ACCOUNTING_ACCESS_CONTEXT
  )
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

export async function resetInvoiceFixtures(db: PostgresJsDatabase<any>) {
  await db.delete(journalEntries)
  await db.delete(invoices)
  await db.delete(customers)

  await db.insert(customers).values({
    address: '10 rue de la Paix, 75002 Paris',
    company: 'Test Company SAS',
    email: 'contact@testco.fr',
    id: TEST_CUSTOMER_ID,
    name: 'Alice Martin',
    phone: '+33 6 12 34 56 78',
  })

  await db.insert(customers).values({
    address: '42 avenue des Clients, 69000 Lyon',
    company: 'Second Company SARL',
    email: 'second@testco.fr',
    id: SECOND_CUSTOMER_ID,
    name: 'Bob Martin',
    phone: '+33 6 98 76 54 32',
  })
}
