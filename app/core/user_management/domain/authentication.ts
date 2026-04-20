export interface AuthProviderUser {
  createdAt: Date
  email: string
  emailVerified: boolean
  id: string
  image?: null | string
  isAnonymous: boolean
  name: null | string
  /** Stable, opaque public identifier — safe to expose to the frontend. */
  publicId: string
}

export interface AuthResult {
  session: AuthSession
  user: AuthProviderUser
}

export interface AuthSession {
  /** Active workspace (organization) id — canonical tenant id for the app. */
  activeOrganizationId: null | string
  expiresAt: Date
  token: string
  userId: string
}

export abstract class AuthenticationPort {
  abstract changePassword(
    sessionToken: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void>

  abstract getOAuthUrl(provider: 'github' | 'google'): string

  abstract getSession(sessionToken: null | string): Promise<AuthResult | null>

  abstract getUserById(externalId: string): Promise<AuthProviderUser | null>

  abstract requestPasswordReset(email: string): Promise<void>

  abstract resetPassword(token: string, newPassword: string): Promise<void>

  abstract sendVerificationEmail(email: string): Promise<void>

  abstract signIn(email: string, password: string): Promise<AuthResult>

  abstract signInAnonymously(): Promise<AuthResult>

  abstract signOut(sessionToken: string): Promise<void>

  abstract signUp(email: string, password: string, name?: string): Promise<AuthResult>

  abstract updateUser(
    sessionToken: string,
    data: { image?: string; name?: string }
  ): Promise<AuthProviderUser>

  abstract validateSession(token: string): Promise<AuthResult>

  abstract verifyEmail(token: string): Promise<void>
}
