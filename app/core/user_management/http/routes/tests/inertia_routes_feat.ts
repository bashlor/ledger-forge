import { AUTH_SESSION_TOKEN_COOKIE_NAME } from '#core/user_management/auth_session_cookie'
import {
  AuthenticationPort,
  type AuthProviderUser,
  type AuthResult,
} from '#core/user_management/domain/authentication'
import { InvalidCredentialsError } from '#core/user_management/domain/errors'
import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'

const guestUser: AuthProviderUser = {
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  email: 'guest@example.com',
  emailVerified: true,
  id: 'user_guest',
  image: null,
  isAnonymous: false,
  name: 'Guest User',
}

const anonymousUser: AuthProviderUser = {
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  email: 'anonymous@example.com',
  emailVerified: true,
  id: 'user_anonymous',
  image: null,
  isAnonymous: true,
  name: 'Anonymous User',
}

class RouteAuthenticationStub extends AuthenticationPort {
  changePasswordCalls = 0
  updateUserCalls = 0

  constructor(private readonly session: AuthResult | null = null) {
    super()
  }

  async changePassword(
    _sessionToken: string,
    _currentPassword: string,
    _newPassword: string
  ): Promise<void> {
    this.changePasswordCalls += 1
  }
  getOAuthUrl(): string {
    return '/api/auth/sign-in/social'
  }
  async getSession(_sessionToken: null | string): Promise<AuthResult | null> {
    return this.session
  }
  async getUserById(_externalId: string): Promise<AuthProviderUser | null> {
    return this.session?.user ?? null
  }
  async requestPasswordReset(_email: string): Promise<void> {}
  async resetPassword(_token: string, _newPassword: string): Promise<void> {}
  async sendVerificationEmail(_email: string): Promise<void> {}
  async signIn(_email: string, _password: string): Promise<AuthResult> {
    return {
      session: {
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
        token: 'session_token',
        userId: guestUser.id,
      },
      user: guestUser,
    }
  }
  async signInAnonymously(): Promise<AuthResult> {
    return {
      session: {
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
        token: 'anonymous_session_token',
        userId: anonymousUser.id,
      },
      user: anonymousUser,
    }
  }
  async signOut(_sessionToken: string): Promise<void> {}
  async signUp(_email: string, _password: string, _name?: string): Promise<AuthResult> {
    return {
      session: {
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
        token: 'session_token',
        userId: guestUser.id,
      },
      user: guestUser,
    }
  }
  async updateUser(
    _sessionToken: string,
    _data: { image?: string; name?: string }
  ): Promise<AuthProviderUser> {
    this.updateUserCalls += 1
    return this.session?.user ?? guestUser
  }
  async validateSession(_token: string): Promise<AuthResult> {
    return {
      session: {
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
        token: 'session_token',
        userId: guestUser.id,
      },
      user: guestUser,
    }
  }
  async verifyEmail(_token: string): Promise<void> {}
}

function inertiaHeaders(request: any) {
  request.header('x-inertia', 'true')
  request.header('x-inertia-version', '1')
  return request
}

test.group('Auth inertia routes', (group) => {
  group.each.setup(() => {
    const auth = new RouteAuthenticationStub()

    app.container.bindValue(AuthenticationPort, auth)
    app.container.bindValue('authAdapter', auth)
  })

  test('signs a user in when auth succeeds', async ({ assert, client }) => {
    const response = await client
      .post('/signin')
      .redirects(0)
      .form({ email: 'sam@example.com', password: 'SecureP@ss123' })

    response.assertStatus(302)
    response.assertHeader('location', '/dashboard')
    const setCookies = response.headers()['set-cookie']
    const serializedCookies = Array.isArray(setCookies) ? setCookies.join('; ') : (setCookies ?? '')
    assert.include(serializedCookies, `${AUTH_SESSION_TOKEN_COOKIE_NAME}=`)
    assert.notInclude(serializedCookies, 'e:')
  })

  test('redirects back to signin when auth rejects credentials', async ({ client }) => {
    const auth = new RouteAuthenticationStub()
    auth.signIn = async () => {
      throw new InvalidCredentialsError()
    }
    app.container.bindValue(AuthenticationPort, auth)
    app.container.bindValue('authAdapter', auth)

    const response = await client
      .post('/signin')
      .header('referer', '/signin')
      .redirects(0)
      .form({ email: 'sam@example.com', password: 'wrong-password' })

    response.assertStatus(302)
    response.assertHeader('location', '/signin')
    response.assertCookieMissing(AUTH_SESSION_TOKEN_COOKIE_NAME)
  })

  test('creates a user when auth accepts signup', async ({ assert, client }) => {
    const auth = new RouteAuthenticationStub()
    auth.signUp = async () => ({
      session: {
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
        token: 'signup_token',
        userId: guestUser.id,
      },
      user: guestUser,
    })
    app.container.bindValue(AuthenticationPort, auth)
    app.container.bindValue('authAdapter', auth)

    const response = await client.post('/signup').redirects(0).form({
      email: 'new-user@example.com',
      fullName: 'New User',
      password: 'SecureP@ss123',
      passwordConfirmation: 'SecureP@ss123',
    })

    response.assertStatus(302)
    response.assertHeader('location', '/dashboard')
    const setCookies = response.headers()['set-cookie']
    const serializedCookies = Array.isArray(setCookies) ? setCookies.join('; ') : (setCookies ?? '')
    assert.include(serializedCookies, `${AUTH_SESSION_TOKEN_COOKIE_NAME}=`)
    assert.notInclude(serializedCookies, 'e:')
  })

  test('signs in anonymously when anonymous auth succeeds', async ({ assert, client }) => {
    const response = await client.post('/signin/anonymous').redirects(0).form({})

    response.assertStatus(302)
    response.assertHeader('location', '/dashboard')
    const setCookies = response.headers()['set-cookie']
    const serializedCookies = Array.isArray(setCookies) ? setCookies.join('; ') : (setCookies ?? '')
    assert.include(serializedCookies, `${AUTH_SESSION_TOKEN_COOKIE_NAME}=`)
    assert.notInclude(serializedCookies, 'e:')
  })

  test('renders account settings for anonymous users in read-only mode', async ({
    assert,
    client,
  }) => {
    const auth = new RouteAuthenticationStub({
      session: {
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
        token: 'anonymous_session_token',
        userId: anonymousUser.id,
      },
      user: anonymousUser,
    })
    app.container.bindValue(AuthenticationPort, auth)
    app.container.bindValue('authAdapter', auth)

    const response = await inertiaHeaders(client.get('/account')).cookie(
      AUTH_SESSION_TOKEN_COOKIE_NAME,
      'anonymous_session_token'
    )

    response.assertStatus(200)
    assert.equal(response.body().component, 'account/settings')
    assert.deepEqual(response.body().props.user, {
      email: anonymousUser.email,
      image: anonymousUser.image,
      isAnonymous: true,
      name: anonymousUser.name,
    })
  })

  test('rejects anonymous profile updates without calling the auth provider', async ({
    assert,
    client,
  }) => {
    const auth = new RouteAuthenticationStub({
      session: {
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
        token: 'anonymous_session_token',
        userId: anonymousUser.id,
      },
      user: anonymousUser,
    })
    app.container.bindValue(AuthenticationPort, auth)
    app.container.bindValue('authAdapter', auth)

    const response = await inertiaHeaders(client.post('/account'))
      .cookie(AUTH_SESSION_TOKEN_COOKIE_NAME, 'anonymous_session_token')
      .redirects(0)
      .form({ name: 'Changed Name' })

    response.assertStatus(302)
    response.assertHeader('location', '/account')
    assert.equal(auth.updateUserCalls, 0)
  })

  test('rejects anonymous password changes without calling the auth provider', async ({
    assert,
    client,
  }) => {
    const auth = new RouteAuthenticationStub({
      session: {
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
        token: 'anonymous_session_token',
        userId: anonymousUser.id,
      },
      user: anonymousUser,
    })
    app.container.bindValue(AuthenticationPort, auth)
    app.container.bindValue('authAdapter', auth)

    const response = await inertiaHeaders(client.post('/account/password'))
      .cookie(AUTH_SESSION_TOKEN_COOKIE_NAME, 'anonymous_session_token')
      .redirects(0)
      .form({
        currentPassword: 'current-password',
        newPassword: 'SecureP@ss123',
        newPasswordConfirmation: 'SecureP@ss123',
      })

    response.assertStatus(302)
    response.assertHeader('location', '/account')
    assert.equal(auth.changePasswordCalls, 0)
  })
})
