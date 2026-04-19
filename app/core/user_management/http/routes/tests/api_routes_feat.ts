import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'

function bindBetterAuth(handler: (request: Request) => Promise<Response>) {
  app.container.bindValue('betterAuth' as any, { handler } as any)
}

test.group('Auth API proxy routes', () => {
  test('forwards successful better-auth responses including headers and body', async ({
    assert,
    client,
  }) => {
    let captured: null | { body: string; method: string; pathname: string } = null

    bindBetterAuth(async (request: Request) => {
      captured = {
        body: await request.text(),
        method: request.method,
        pathname: new URL(request.url).pathname,
      }

      const headers = new Headers({
        'content-type': 'application/json',
        'x-auth-upstream': 'better-auth',
      })
      headers.append('set-cookie', 'session=abc; Path=/; HttpOnly')

      return new Response(JSON.stringify({ ok: true }), {
        headers,
        status: 200,
      })
    })

    const response = await client.post('/api/auth/test-endpoint').json({
      email: 'sam@example.com',
    })

    response.assertStatus(200)
    response.assertHeader('x-auth-upstream', 'better-auth')
    assert.match(response.header('content-type') ?? '', /application\/json/)
    response.assertBody({ ok: true })

    const setCookies = response.headers()['set-cookie']
    const serializedCookies = Array.isArray(setCookies) ? setCookies.join('; ') : (setCookies ?? '')
    assert.include(serializedCookies, 'session=abc')
    assert.deepEqual(captured, {
      body: JSON.stringify({ email: 'sam@example.com' }),
      method: 'POST',
      pathname: '/api/auth/test-endpoint',
    })
  })

  test('maps known better-auth errors to HttpProblem responses', async ({ assert, client }) => {
    bindBetterAuth(async () => {
      return Response.json({ code: 'INVALID_EMAIL_OR_PASSWORD' }, { status: 400 })
    })

    const response = await client.post('/api/auth/sign-in').json({
      email: 'sam@example.com',
      password: 'wrong-password',
    })

    response.assertStatus(401)
    assert.match(response.header('content-type') ?? '', /application\/problem\+json/)
    assert.deepEqual(response.body(), {
      code: 'auth.invalid_credentials',
      detail: 'Invalid email or password.',
      status: 401,
      title: 'Unauthorized',
      type: 'urn:accounting-app:better-auth:INVALID_EMAIL_OR_PASSWORD',
    })
  })

  test('falls back to the generic HttpProblem mapping for unknown better-auth errors', async ({
    assert,
    client,
  }) => {
    bindBetterAuth(async () => {
      return Response.json({ code: 'SOMETHING_NEW' }, { status: 418 })
    })

    const response = await client.get('/api/auth/unknown-code')

    response.assertStatus(500)
    assert.match(response.header('content-type') ?? '', /application\/problem\+json/)
    assert.deepEqual(response.body(), {
      code: 'auth.provider_failure',
      detail: 'An unexpected error occurred. Please try again.',
      status: 500,
      title: 'Internal Server Error',
      type: 'urn:accounting-app:better-auth:SOMETHING_NEW',
    })
  })

  test('returns an authentication HttpProblem when the handler throws', async ({
    assert,
    client,
  }) => {
    bindBetterAuth(async () => {
      throw new Error('upstream crashed')
    })

    const response = await client.get('/api/auth/throws')

    response.assertStatus(500)
    assert.match(response.header('content-type') ?? '', /application\/problem\+json/)
    assert.deepEqual(response.body(), {
      code: 'auth.provider_failure',
      detail: 'An unexpected authentication error occurred. Please try again.',
      status: 500,
      title: 'Internal Server Error',
      type: 'urn:accounting-app:error:unspecified_internal_error',
    })
  })
})
