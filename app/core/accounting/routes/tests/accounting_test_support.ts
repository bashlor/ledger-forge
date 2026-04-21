import type { AccountingAccessContext } from '#core/accounting/application/support/access_context'

import { AUTH_SESSION_TOKEN_COOKIE_NAME } from '#core/user_management/auth_session_cookie'
import {
  AuthenticationPort,
  type AuthProviderUser,
  type AuthResult,
} from '#core/user_management/domain/authentication'
import app from '@adonisjs/core/services/app'

import { TEST_TENANT_ID } from '../../../../../tests/helpers/testcontainers_db.js'

export const TEST_ACCOUNTING_USER_ID = 'user_test_invoices'
export const TEST_ACCOUNTING_USER_PUBLIC_ID = 'pub_user_test_invoices'
export const TEST_ACCOUNTING_USER_EMAIL = 'test@example.com'

type AccountingAuthContext = {
  email: string
  organizationId: string
  token: string
  userId: string
  userPublicId: string
}

let authContext: AccountingAuthContext = {
  email: TEST_ACCOUNTING_USER_EMAIL,
  organizationId: TEST_TENANT_ID,
  token: 'test_session_token_accounting',
  userId: TEST_ACCOUNTING_USER_ID,
  userPublicId: TEST_ACCOUNTING_USER_PUBLIC_ID,
}
const defaultAuthContext: AccountingAuthContext = { ...authContext }

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

function fakeSessionFromContext(context: AccountingAuthContext): AuthResult {
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

function fakeUserFromContext(context: AccountingAuthContext): AuthProviderUser {
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
  actorId: TEST_ACCOUNTING_USER_ID,
  isAnonymous: false,
  requestId: 'test',
  tenantId: TEST_TENANT_ID,
}

export function authCookie() {
  return `${AUTH_SESSION_TOKEN_COOKIE_NAME}=${authContext.token}`
}

export function bindAccountingAuth() {
  const auth = new FakeAuth(fakeSessionFromContext(authContext))
  app.container.bindValue(AuthenticationPort, auth)
  app.container.bindValue('authAdapter', auth)
}

export function resetAccountingAuthContext() {
  authContext = { ...defaultAuthContext }
}

export function setAccountingAuthContext(overrides: Partial<AccountingAuthContext> = {}) {
  authContext = {
    ...authContext,
    ...overrides,
  }
}
