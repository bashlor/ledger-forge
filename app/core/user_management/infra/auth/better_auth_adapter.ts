import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import * as schema from '#core/common/drizzle/index'
import { DomainError } from '#core/common/errors/domain_error'
import { getDefaultStructuredLogFields, toIsoTimestamp } from '#core/common/logging/structured_log'
import { eq } from 'drizzle-orm'

import type { AuthProviderUser, AuthResult, AuthSession } from '../../domain/authentication.js'
import type { SelectSession, SelectUser } from '../../drizzle/schema.js'
import type { UserManagementActivitySink } from '../../support/activity_log.js'
import type { BetterAuthInstance } from './better_auth_drizzle.js'

import { AUTH_SESSION_TOKEN_COOKIE_NAME } from '../../auth_session_cookie.js'
import { AuthenticationPort } from '../../domain/authentication.js'
import { AuthenticationError } from '../../domain/errors.js'
import { mapBetterAuthError } from './map_better_auth_error.js'

export class BetterAuthAdapter extends AuthenticationPort {
  public constructor(
    private auth: BetterAuthInstance,
    private drizzle: PostgresJsDatabase<typeof schema>,
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
      return await this.loadAuthResultBySessionToken(sessionToken, {
        logExpectedFailures: true,
      })
    } catch (err) {
      this.recordAuthEvent(
        'auth_session_database_error',
        'failure',
        'unknown',
        null,
        'error',
        err instanceof Error
          ? { errorCode: 'auth_session_database_error', errorName: err.name }
          : { errorCode: 'auth_session_database_error', errorName: 'UnknownError' }
      )
      return null
    }
  }

  async getUserById(externalId: string): Promise<AuthProviderUser | null> {
    try {
      const row = await this.drizzle.query.user.findFirst({
        where: eq(schema.user.id, externalId),
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

    return this.loadRequiredAuthResultBySessionToken(
      response.token,
      'Session not found after sign-in'
    )
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

    return this.loadRequiredAuthResultBySessionToken(
      response.token,
      'Session not found after anonymous sign-in'
    )
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

    return this.loadRequiredAuthResultBySessionToken(
      response.token,
      'Session not found after sign-up'
    )
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

  private async loadAuthResultBySessionToken(
    sessionToken: string,
    options: {
      logExpectedFailures?: boolean
    } = {}
  ): Promise<AuthResult | null> {
    const session = await this.drizzle.query.session.findFirst({
      where: eq(schema.session.token, sessionToken),
    })

    if (!session) {
      if (options.logExpectedFailures) {
        this.recordAuthEvent('auth_session_not_found', 'failure', 'unknown', null, 'warn')
      }
      return null
    }

    if (new Date(session.expiresAt) < new Date()) {
      if (options.logExpectedFailures) {
        this.recordAuthEvent(
          'auth_session_expired',
          'failure',
          String(session.userId),
          null,
          'warn'
        )
      }
      return null
    }

    const user = await this.drizzle.query.user.findFirst({
      where: eq(schema.user.id, session.userId),
    })

    if (!user) {
      if (options.logExpectedFailures) {
        this.recordAuthEvent(
          'auth_session_user_not_found',
          'failure',
          String(session.userId),
          null,
          'warn'
        )
      }
      return null
    }

    return this.toAuthResult(session, user)
  }

  private async loadRequiredAuthResultBySessionToken(
    sessionToken: string,
    missingSessionMessage: string
  ): Promise<AuthResult> {
    const session = await this.drizzle.query.session.findFirst({
      where: eq(schema.session.token, sessionToken),
    })

    if (!session) {
      throw AuthenticationError.linkingFailed(missingSessionMessage)
    }

    const user = await this.drizzle.query.user.findFirst({
      where: eq(schema.user.id, session.userId),
    })

    if (!user) {
      throw AuthenticationError.linkingFailed('User not found for authenticated session')
    }

    return this.toAuthResult(session, user)
  }

  private mapSessionRow(session: SelectSession): AuthSession {
    const expiresAt =
      session.expiresAt instanceof Date ? session.expiresAt : new Date(session.expiresAt)
    return {
      activeOrganizationId: session.activeOrganizationId ?? null,
      expiresAt,
      token: session.token,
      userId: session.userId,
    }
  }

  private mapToAuthProviderUser(user: SelectUser): AuthProviderUser {
    return {
      createdAt: new Date(user.createdAt),
      email: user.email,
      emailVerified: user.emailVerified ?? false,
      id: String(user.id),
      image: user.image ?? null,
      isAnonymous: user.isAnonymous ?? false,
      name: user.name ?? null,
      publicId: user.publicId,
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

  private toAuthResult(session: SelectSession, user: SelectUser): AuthResult {
    return {
      session: this.mapSessionRow(session),
      user: this.mapToAuthProviderUser(user),
    }
  }
}
