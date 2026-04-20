import { DomainError } from '#core/common/errors/domain_error'
import { AuthenticationError } from '#core/user_management/domain/errors'
import { mapBetterAuthError } from '#core/user_management/infra/auth/map_better_auth_error'
import { test } from '@japa/runner'

import { domainErrorToHttpStatus, HttpProblem, lookupBetterAuthError } from './http_problem.js'

test.group('HttpProblem', () => {
  test('maps domain errors to problem details through the shared public-error resolver', ({
    assert,
  }) => {
    const problem = HttpProblem.fromError(
      new DomainError('Missing invoice', 'not_found', 'InvoiceNotFoundError')
    )

    assert.equal(problem.status, 404)
    assert.equal(problem.title, 'Not Found')
    assert.equal(problem.detail, 'The requested resource was not found.')
    assert.equal(problem.type, 'urn:accounting-app:error:not_found')
    assert.deepEqual(problem.extensions, { code: 'domain.not_found' })
  })

  test('maps Better Auth errors and falls back for unknown codes', ({ assert }) => {
    const known = HttpProblem.fromBetterAuthCode('INVALID_EMAIL_OR_PASSWORD')
    const orgForbidden = HttpProblem.fromBetterAuthCode(
      'YOU_ARE_NOT_ALLOWED_TO_ACCESS_THIS_ORGANIZATION'
    )
    const businessRule = HttpProblem.fromBetterAuthCode(
      'YOU_CANNOT_LEAVE_THE_ORGANIZATION_AS_THE_ONLY_OWNER'
    )
    const unknown = HttpProblem.fromBetterAuthCode('SOME_UNKNOWN_CODE')

    assert.equal(known.status, 401)
    assert.equal(known.detail, 'Invalid email or password.')
    assert.equal(known.type, 'urn:accounting-app:better-auth:INVALID_EMAIL_OR_PASSWORD')
    assert.deepEqual(known.extensions, { code: 'auth.invalid_credentials' })

    assert.equal(orgForbidden.status, 403)
    assert.equal(orgForbidden.detail, 'You are not allowed to access this organization.')
    assert.equal(
      orgForbidden.type,
      'urn:accounting-app:better-auth:YOU_ARE_NOT_ALLOWED_TO_ACCESS_THIS_ORGANIZATION'
    )
    assert.deepEqual(orgForbidden.extensions, { code: 'auth.forbidden' })

    assert.equal(businessRule.status, 422)
    assert.equal(businessRule.detail, 'The requested action could not be completed.')
    assert.equal(
      businessRule.type,
      'urn:accounting-app:better-auth:YOU_CANNOT_LEAVE_THE_ORGANIZATION_AS_THE_ONLY_OWNER'
    )
    assert.deepEqual(businessRule.extensions, { code: 'domain.business_logic_error' })

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

  test('maps translated organization errors through the same public contract', ({ assert }) => {
    const forbidden = HttpProblem.fromError(
      mapBetterAuthError({ code: 'YOU_ARE_NOT_ALLOWED_TO_ACCESS_THIS_ORGANIZATION' })
    )
    const lookup = HttpProblem.fromError(
      mapBetterAuthError({ code: 'INVITER_IS_NO_LONGER_A_MEMBER_OF_THE_ORGANIZATION' })
    )
    const businessRule = HttpProblem.fromError(
      mapBetterAuthError({ code: 'ORGANIZATION_MEMBERSHIP_LIMIT_REACHED' })
    )

    assert.equal(forbidden.status, 403)
    assert.equal(forbidden.detail, 'You are not allowed to access this organization.')
    assert.deepEqual(forbidden.extensions, { code: 'auth.forbidden' })

    assert.equal(lookup.status, 404)
    assert.equal(lookup.detail, 'The inviter is no longer a member of this organization.')
    assert.deepEqual(lookup.extensions, { code: 'auth.resource_not_found' })

    assert.equal(businessRule.status, 422)
    assert.equal(businessRule.detail, 'The requested action could not be completed.')
    assert.deepEqual(businessRule.extensions, { code: 'domain.business_logic_error' })
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
    assert.deepEqual(lookupBetterAuthError('FAILED_TO_RETRIEVE_INVITATION'), {
      status: 422,
      userMessage: 'The invitation could not be processed. Please try again.',
    })
    assert.deepEqual(lookupBetterAuthError(undefined), {
      status: 500,
      userMessage: 'An unexpected error occurred. Please try again.',
    })
  })
})
