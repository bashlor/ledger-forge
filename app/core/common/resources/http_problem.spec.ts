import { DomainError } from '#core/shared/domain_error'
import { AuthenticationError } from '#core/user_management/domain/errors'
import { test } from '@japa/runner'

import { domainErrorToHttpStatus, HttpProblem, lookupBetterAuthError } from './http_problem.js'

test.group('HttpProblem', () => {
  test('maps domain errors to problem details', ({ assert }) => {
    const problem = HttpProblem.fromDomainError(
      new DomainError('Missing invoice', 'not_found', 'InvoiceNotFoundError')
    )

    assert.equal(problem.status, 404)
    assert.equal(problem.title, 'Not Found')
    assert.equal(problem.detail, 'Missing invoice')
    assert.equal(problem.type, 'urn:accounting-app:error:not_found')
  })

  test('maps Better Auth errors and falls back for unknown codes', ({ assert }) => {
    const known = HttpProblem.fromBetterAuthCode('INVALID_EMAIL_OR_PASSWORD')
    const unknown = HttpProblem.fromBetterAuthCode('SOME_UNKNOWN_CODE')

    assert.equal(known.status, 401)
    assert.equal(known.detail, 'Invalid email or password.')
    assert.equal(known.type, 'urn:accounting-app:better-auth:INVALID_EMAIL_OR_PASSWORD')
    assert.deepEqual(known.extensions, { code: 'auth.invalid_credentials' })

    assert.equal(unknown.status, 500)
    assert.equal(unknown.detail, 'An unexpected error occurred. Please try again.')
    assert.equal(unknown.type, 'urn:accounting-app:better-auth:SOME_UNKNOWN_CODE')
    assert.deepEqual(unknown.extensions, { code: 'auth.provider_failure' })
  })

  test('maps generic application errors through the shared public-error resolver', ({ assert }) => {
    const problem = HttpProblem.fromError(new AuthenticationError('Leaky internal detail'))

    assert.equal(problem.status, 500)
    assert.equal(problem.detail, 'An unexpected authentication error occurred. Please try again.')
    assert.equal(problem.type, 'urn:accounting-app:error:unspecified_internal_error')
    assert.deepEqual(problem.extensions, { code: 'auth.provider_failure' })
  })

  test('serializes and writes problem details to a response', ({ assert }) => {
    const headers = new Map<string, string>()
    let statusCode: number | undefined
    let jsonBody: Record<string, unknown> | undefined

    const problem = new HttpProblem(422, 'Unprocessable Entity', 'Bad payload', 'urn:test', '/x', {
      field: 'email',
    })

    problem.toResponse({
      header(key, value) {
        headers.set(key, value)
      },
      json(body) {
        jsonBody = body as Record<string, unknown>
      },
      status(code) {
        statusCode = code
      },
    })

    assert.equal(statusCode, 422)
    assert.equal(headers.get('Content-Type'), 'application/problem+json')
    assert.deepEqual(jsonBody, {
      detail: 'Bad payload',
      field: 'email',
      instance: '/x',
      status: 422,
      title: 'Unprocessable Entity',
      type: 'urn:test',
    })
  })

  test('exposes direct status lookups for domain and Better Auth errors', ({ assert }) => {
    assert.equal(domainErrorToHttpStatus('forbidden'), 403)
    assert.equal(domainErrorToHttpStatus('unknown-tag'), 500)

    assert.deepEqual(lookupBetterAuthError('USER_ALREADY_EXISTS'), {
      status: 409,
      userMessage: 'An account with this email already exists.',
    })
    assert.deepEqual(lookupBetterAuthError(undefined), {
      status: 500,
      userMessage: 'An unexpected error occurred. Please try again.',
    })
  })
})
