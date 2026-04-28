import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import * as schema from '#core/common/drizzle/index'
import { DomainError } from '#core/common/errors/domain_error'
import { getDefaultStructuredLogFields, toIsoTimestamp } from '#core/common/logging/structured_log'
import env from '#start/env'
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

  getOAuthUrl(provider: 'github' | 'google'): string {
    throw new DomainError(
      `OAuth provider "${provider}" is not enabled for this demo.`,
      'forbidden',
      'OAuthProviderDisabledError'
    )
  }

  async getSession(sessionToken: null | string): Promise<AuthResult | null> {
    if (!sessionToken) {
      return null
    }

    try {
      const viaHandler = await this.loadAuthResultFromBetterAuthHandler(sessionToken)
      if (viaHandler) {
        return viaHandler
      }

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

    if (!response.token) {
      throw AuthenticationError.linkingFailed('No session token returned after sign-in')
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

    if (!response.token) {
      throw AuthenticationError.linkingFailed('No session token returned after anonymous sign-in')
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

  private async loadAuthResultFromBetterAuthHandler(
    sessionToken: string
  ): Promise<AuthResult | null> {
    try {
      const response = await this.auth.handler(
        new Request(new URL('/api/auth/get-session', env.get('APP_URL')), {
          headers: this.createAuthHeaders(sessionToken),
          method: 'GET',
        })
      )

      if (!response.ok) {
        return null
      }

      const payload = (await response.json()) as unknown
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return null
      }

      const candidate = payload as {
        session?: Record<string, unknown>
        user?: Record<string, unknown>
      }

      const session = candidate.session
      const user = candidate.user
      if (!session || !user) {
        return null
      }

      const activeOrganizationId = this.readOptionalNullableString(session.activeOrganizationId)
      const expiresAt = this.readDate(session.expiresAt)
      const token = this.readString(session.token)
      const userId = this.readString(session.userId)
      const createdAt = this.readDate(user.createdAt)
      const email = this.readString(user.email)
      const emailVerified = this.readBoolean(user.emailVerified)
      const id = this.readString(user.id)
      const isAnonymous = this.readBoolean(user.isAnonymous)
      const publicId = this.readString(user.publicId)
      const name = this.readNullableString(user.name)
      const image = this.readNullableString(user.image)

      if (
        activeOrganizationId === undefined ||
        !expiresAt ||
        !token ||
        !userId ||
        !createdAt ||
        !email ||
        !id ||
        !publicId ||
        emailVerified === undefined ||
        isAnonymous === undefined
      ) {
        return null
      }

      return {
        session: {
          activeOrganizationId,
          expiresAt,
          token,
          userId,
        },
        user: {
          createdAt,
          email,
          emailVerified,
          id,
          image,
          isAnonymous,
          name,
          publicId,
        },
      }
    } catch {
      return null
    }
  }

  private async loadRequiredAuthResultBySessionToken(
    sessionToken: string,
    missingSessionMessage: string
  ): Promise<AuthResult> {
    const result = await this.loadAuthResultBySessionToken(sessionToken)
    if (!result) {
      throw AuthenticationError.linkingFailed(missingSessionMessage)
    }

    return result
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

  private readBoolean(value: unknown): boolean | undefined {
    return typeof value === 'boolean' ? value : undefined
  }

  private readDate(value: unknown): Date | null {
    if (value instanceof Date) {
      return value
    }

    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value)
      return Number.isNaN(parsed.getTime()) ? null : parsed
    }

    return null
  }

  private readNullableString(value: unknown): null | string {
    if (value === undefined || value === null) {
      return null
    }

    return typeof value === 'string' ? value : null
  }

  private readOptionalNullableString(value: unknown): null | string | undefined {
    if (value === undefined) {
      return undefined
    }

    if (value === null) {
      return null
    }

    return typeof value === 'string' ? value : undefined
  }

  private readString(value: unknown): string | undefined {
    return typeof value === 'string' && value.length > 0 ? value : undefined
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
