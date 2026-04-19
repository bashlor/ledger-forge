import type {
  AuthProviderUser,
  AuthResult,
  AuthSession,
} from '#core/user_management/domain/authentication'

import { DomainError } from '#core/common/errors/domain_error'
import { AuthenticationPort } from '#core/user_management/domain/authentication'
import {
  InvalidCredentialsError,
  UserAlreadyExistsError,
  UserNotFoundError,
} from '#core/user_management/domain/errors'
import { randomUUID } from 'node:crypto'

/**
 * Pure in-memory implementation of `IAuthenticationProvider`.
 *
 * No database, no SQLite, no Better Auth — just `Map`s.
 * Used for **feature tests** that need the auth contract
 * without any external dependency.
 */
export class InMemoryAuthProvider extends AuthenticationPort {
  private passwordResetTokens = new Map<string, { email: string; token: string }>()
  private sessions = new Map<string, AuthSession>()
  private users = new Map<string, AuthProviderUser & { password: string }>()
  private verificationTokens = new Map<string, string>() // token → userId

  // =========================================================================
  // Auth
  // =========================================================================

  async changePassword(
    sessionToken: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const session = this.sessions.get(sessionToken)
    if (!session)
      throw new DomainError('Session has expired or is invalid', 'unauthorized_user_operation')
    const user = this.users.get(session.userId)
    if (!user) throw new UserNotFoundError()
    if (user.password !== currentPassword) throw new InvalidCredentialsError()
    user.password = newPassword
  }

  getOAuthUrl(provider: 'github' | 'google'): string {
    return `https://test.example.com/oauth/${provider}`
  }

  async getSession(sessionToken: null | string): Promise<AuthResult | null> {
    if (!sessionToken) return null
    return this.resolveSession(sessionToken)
  }

  async getUserById(externalId: string): Promise<AuthProviderUser | null> {
    const user = this.users.get(externalId)
    if (!user) return null
    return this.toPublicUser(user)
  }

  // =========================================================================
  // Password
  // =========================================================================

  async requestPasswordReset(email: string): Promise<void> {
    const user = [...this.users.values()].find((u) => u.email === email)
    if (!user) return // Silent — no error on unknown email
    const token = randomUUID()
    this.passwordResetTokens.set(token, { email, token })
  }

  /**
   * Reset all state. Call between tests.
   */
  reset(): void {
    this.passwordResetTokens.clear()
    this.sessions.clear()
    this.users.clear()
    this.verificationTokens.clear()
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const entry = this.passwordResetTokens.get(token)
    if (!entry)
      throw new DomainError('The link has expired or is invalid.', 'unauthorized_user_operation')
    const user = [...this.users.values()].find((u) => u.email === entry.email)
    if (!user) throw new UserNotFoundError()
    user.password = newPassword
    this.passwordResetTokens.delete(token)
  }

  // =========================================================================
  // Session
  // =========================================================================

  async sendVerificationEmail(email: string): Promise<void> {
    const user = [...this.users.values()].find((u) => u.email === email)
    if (!user) return
    const token = randomUUID()
    this.verificationTokens.set(token, user.id)
  }

  async signIn(email: string, password: string): Promise<AuthResult> {
    const user = [...this.users.values()].find((u) => u.email === email)
    if (!user || user.password !== password) throw new InvalidCredentialsError()
    return this.createSession(user)
  }

  async signInAnonymously(): Promise<AuthResult> {
    const id = randomUUID()
    const now = new Date()
    const user = {
      createdAt: now,
      email: `anonymous-${id}@example.local`,
      emailVerified: false,
      id,
      image: null,
      isAnonymous: true,
      name: 'Anonymous',
      password: randomUUID(),
    }

    this.users.set(id, user)
    return this.createSession(user)
  }

  // =========================================================================
  // User
  // =========================================================================

  async signOut(sessionToken: string): Promise<void> {
    this.sessions.delete(sessionToken)
  }

  async signUp(email: string, password: string, name?: string): Promise<AuthResult> {
    const exists = [...this.users.values()].some((u) => u.email === email)
    if (exists) throw new UserAlreadyExistsError()

    const id = randomUUID()
    const now = new Date()

    const user = {
      createdAt: now,
      email,
      emailVerified: false,
      id,
      image: null,
      isAnonymous: false,
      name: name ?? 'User',
      password,
    }

    this.users.set(id, user)
    return this.createSession(user)
  }

  async updateUser(
    sessionToken: string,
    data: { image?: string; name?: string }
  ): Promise<AuthProviderUser> {
    const session = this.sessions.get(sessionToken)
    if (!session)
      throw new DomainError('Session has expired or is invalid', 'unauthorized_user_operation')
    const user = this.users.get(session.userId)
    if (!user) throw new UserNotFoundError()
    if (data.name !== undefined) user.name = data.name
    if (data.image !== undefined) user.image = data.image
    return this.toPublicUser(user)
  }

  // =========================================================================
  // Email Verification
  // =========================================================================

  async validateSession(token: string): Promise<AuthResult> {
    const result = this.resolveSession(token)
    if (!result)
      throw new DomainError('Session has expired or is invalid', 'unauthorized_user_operation')
    return result
  }

  async verifyEmail(token: string): Promise<void> {
    const userId = this.verificationTokens.get(token)
    if (!userId)
      throw new DomainError('The link has expired or is invalid.', 'unauthorized_user_operation')
    const user = this.users.get(userId)
    if (!user) throw new UserNotFoundError()
    user.emailVerified = true
    this.verificationTokens.delete(token)
  }

  // =========================================================================
  // Private
  // =========================================================================

  private createSession(user: AuthProviderUser & { password: string }): AuthResult {
    const token = randomUUID()
    const session: AuthSession = {
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      token,
      userId: user.id,
    }
    this.sessions.set(token, session)
    return { session, user: this.toPublicUser(user) }
  }

  private resolveSession(token: string): AuthResult | null {
    const session = this.sessions.get(token)
    if (!session) return null
    if (session.expiresAt < new Date()) {
      this.sessions.delete(token)
      return null
    }
    const user = this.users.get(session.userId)
    if (!user) return null
    return { session, user: this.toPublicUser(user) }
  }

  private toPublicUser(user: AuthProviderUser & { password: string }): AuthProviderUser {
    return {
      createdAt: user.createdAt,
      email: user.email,
      emailVerified: user.emailVerified,
      id: user.id,
      image: user.image,
      isAnonymous: user.isAnonymous,
      name: user.name,
    }
  }
}
