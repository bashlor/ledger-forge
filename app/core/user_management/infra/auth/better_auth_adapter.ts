import { DomainError } from '#core/common/errors/domain_error'
import { getDefaultStructuredLogFields, toIsoTimestamp } from '#core/common/logging/structured_log'
import { type betterAuth } from 'better-auth'

import type { AuthProviderUser, AuthResult, AuthSession } from '../../domain/authentication.js'
import type { UserManagementActivitySink } from '../../support/activity_log.js'

import { AUTH_SESSION_TOKEN_COOKIE_NAME } from '../../auth_session_cookie.js'
import { AuthenticationPort } from '../../domain/authentication.js'
import { AuthenticationError } from '../../domain/errors.js'
import { mapBetterAuthError } from './map_better_auth_error.js'

export class BetterAuthAdapter extends AuthenticationPort {
  public constructor(
    private auth: Awaited<ReturnType<typeof betterAuth<any>>>,
    private drizzle: any,
    private readonly activitySink?: UserManagementActivitySink
  ) {
    super()
  }

  async changePassword(
    sessionToken: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    try {
      await this.auth.api.changePassword({
        body: {
          currentPassword,
          newPassword,
        },
        headers: this.createAuthHeaders(sessionToken),
      })
    } catch (error) {
      throw mapBetterAuthError(error)
    }
  }

  getOAuthUrl(_provider: 'github' | 'google'): string {
    return '/api/auth/sign-in/social'
  }

  async getSession(sessionToken: null | string): Promise<AuthResult | null> {
    if (!sessionToken) {
      return null
    }

    try {
      // Query directly via Drizzle to avoid Better Auth internal cookie parsing
      // expectations. The browser stores the raw session token and we validate it
      // against the persisted session row.
      const session = await this.drizzle.query.session.findFirst({
        where: (s: any, { eq }: any) => eq(s.token, sessionToken),
      })

      if (!session) {
        this.recordAuthEvent('auth_session_not_found', 'failure', 'unknown', null, 'trace')
        return null
      }

      if (new Date(session.expiresAt) < new Date()) {
        this.recordAuthEvent(
          'auth_session_expired',
          'failure',
          String(session.userId),
          null,
          'trace'
        )
        return null
      }

      const user = await this.drizzle.query.user.findFirst({
        where: (u: any, { eq }: any) => eq(u.id, session.userId),
      })

      if (!user) {
        this.recordAuthEvent(
          'auth_session_user_not_found',
          'failure',
          String(session.userId),
          null,
          'trace'
        )
        return null
      }

      return {
        session: this.mapSessionRow(session),
        user: this.mapToAuthProviderUser(user),
      }
    } catch (err) {
      this.recordAuthEvent(
        'auth_session_database_error',
        'failure',
        'unknown',
        null,
        'error',
        err instanceof Error ? { errorMessage: err.message, errorName: err.name } : undefined
      )
      return null
    }
  }

  async getUserById(externalId: string): Promise<AuthProviderUser | null> {
    try {
      const row = await this.drizzle.query.user.findFirst({
        where: (u: any, { eq }: any) => eq(u.id, externalId),
      })

      if (!row) {
        return null
      }

      return this.mapToAuthProviderUser(row)
    } catch {
      return null
    }
  }

  async requestPasswordReset(email: string): Promise<void> {
    try {
      await this.auth.api.requestPasswordReset({
        body: { email, redirectTo: '/reset-password' },
      })
    } catch (error) {
      throw mapBetterAuthError(error)
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      await this.auth.api.resetPassword({
        body: { newPassword, token },
      })
    } catch (error) {
      throw mapBetterAuthError(error)
    }
  }

  async sendVerificationEmail(email: string): Promise<void> {
    try {
      await this.auth.api.sendVerificationEmail({
        body: { callbackURL: '/', email },
      })
    } catch (error) {
      throw mapBetterAuthError(error)
    }
  }

  async signIn(email: string, password: string): Promise<AuthResult> {
    let response: Awaited<ReturnType<typeof this.auth.api.signInEmail>>

    try {
      response = await this.auth.api.signInEmail({
        body: { email, password },
      })
    } catch (error) {
      throw mapBetterAuthError(error)
    }

    const session = await this.drizzle.query.session.findFirst({
      where: (s: any, { eq }: any) => eq(s.token, response.token),
    })

    if (!session) {
      throw AuthenticationError.linkingFailed('Session not found after sign-in')
    }

    return {
      session: this.mapSessionRow(session),
      user: this.mapToAuthProviderUser(response.user),
    }
  }

  async signInAnonymously(): Promise<AuthResult> {
    type AnonymousApi = {
      signInAnonymous: () => Promise<{
        token: string
        user: {
          createdAt: Date
          email: string
          emailVerified: boolean
          id: string
          image?: null | string
          name: null | string
        }
      }>
    }

    let response: Awaited<ReturnType<AnonymousApi['signInAnonymous']>>
    try {
      response = await (this.auth.api as unknown as AnonymousApi).signInAnonymous()
    } catch (error) {
      throw mapBetterAuthError(error)
    }

    const session = await this.drizzle.query.session.findFirst({
      where: (s: any, { eq }: any) => eq(s.token, response.token),
    })

    if (!session) {
      throw AuthenticationError.linkingFailed('Session not found after anonymous sign-in')
    }

    return {
      session: this.mapSessionRow(session),
      user: {
        createdAt: new Date(response.user.createdAt),
        email: response.user.email,
        emailVerified: response.user.emailVerified,
        id: response.user.id,
        image: response.user.image ?? null,
        isAnonymous: true,
        name: response.user.name ?? null,
      },
    }
  }

  async signOut(sessionToken: string): Promise<void> {
    try {
      await this.auth.api.signOut({
        headers: this.createAuthHeaders(sessionToken),
      })
    } catch (error) {
      throw mapBetterAuthError(error)
    }
  }

  async signUp(email: string, password: string, name?: string): Promise<AuthResult> {
    let response: Awaited<ReturnType<typeof this.auth.api.signUpEmail>>

    try {
      response = await this.auth.api.signUpEmail({
        body: {
          email,
          name: name || 'User',
          password,
        },
      })
    } catch (error) {
      throw mapBetterAuthError(error)
    }

    if (!response.token) {
      throw AuthenticationError.linkingFailed('No session token returned after sign-up')
    }

    const session = await this.drizzle.query.session.findFirst({
      where: (s: any, { eq }: any) => eq(s.token, response.token),
    })

    if (!session) {
      throw AuthenticationError.linkingFailed('Session not found after sign-up')
    }

    return {
      session: this.mapSessionRow(session),
      user: this.mapToAuthProviderUser(response.user),
    }
  }

  async updateUser(
    sessionToken: string,
    data: { image?: string; name?: string }
  ): Promise<AuthProviderUser> {
    try {
      await this.auth.api.updateUser({
        body: data,
        headers: this.createAuthHeaders(sessionToken),
      })
    } catch (error) {
      throw mapBetterAuthError(error)
    }

    const session = await this.getSession(sessionToken)
    if (!session) {
      throw new DomainError('User session not found after update', 'unauthorized_user_operation')
    }

    return session.user
  }

  async validateSession(token: string): Promise<AuthResult> {
    const result = await this.getSession(token)

    if (!result) {
      throw new DomainError('Session has expired or is invalid', 'unauthorized_user_operation')
    }

    return result
  }

  async verifyEmail(token: string): Promise<void> {
    try {
      await this.auth.api.verifyEmail({
        query: { token },
      })
    } catch (error) {
      throw mapBetterAuthError(error)
    }
  }

  private createAuthHeaders(sessionToken: string): Headers {
    const headers = new Headers()
    headers.set('cookie', `${AUTH_SESSION_TOKEN_COOKIE_NAME}=${sessionToken}`)
    return headers
  }

  private mapSessionRow(session: {
    activeOrganizationId?: null | string
    expiresAt: Date | string
    token: string
    userId: string
  }): AuthSession {
    const expiresAt =
      session.expiresAt instanceof Date ? session.expiresAt : new Date(session.expiresAt)
    return {
      activeOrganizationId: session.activeOrganizationId ?? null,
      expiresAt,
      token: session.token,
      userId: session.userId,
    }
  }

  private mapToAuthProviderUser(user: {
    createdAt: Date
    email: string
    emailVerified: boolean
    id: string
    image?: null | string
    isAnonymous?: boolean
    name: string
  }): AuthProviderUser {
    return {
      createdAt: new Date(user.createdAt),
      email: user.email,
      emailVerified: user.emailVerified ?? false,
      id: String(user.id),
      image: user.image ?? null,
      isAnonymous: user.isAnonymous ?? false,
      name: user.name ?? null,
    }
  }

  private recordAuthEvent(
    event: string,
    outcome: 'failure' | 'success',
    entityId: string,
    userId: null | string,
    level: 'debug' | 'error' | 'fatal' | 'info' | 'trace' | 'warn',
    metadata?: Record<string, unknown>
  ): void {
    const defaults = getDefaultStructuredLogFields()

    this.activitySink?.record({
      context: 'UserManagement',
      entityId,
      entityType: 'auth',
      event,
      level,
      metadata,
      outcome,
      requestId: defaults.requestId ?? 'system',
      tenantId: defaults.tenantId ?? null,
      timestamp: toIsoTimestamp(),
      userId: userId ?? defaults.userId ?? null,
    })
  }
}
