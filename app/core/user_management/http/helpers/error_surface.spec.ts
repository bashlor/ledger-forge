import { DomainError } from '#core/common/errors/domain_error'
import { test } from '@japa/runner'

import { resolveInertiaMutation } from './error_surface.js'

function createContext() {
  const flashes: Array<{ key: string; value: unknown }> = []
  const redirects: string[] = []
  let flashedAll = false

  return {
    ctx: {
      request: {
        url() {
          return '/account'
        },
      },
      response: {
        redirect() {
          return {
            toPath(path: string) {
              redirects.push(path)
              return path
            },
          }
        },
      },
      session: {
        flash(key: string, value: unknown) {
          flashes.push({ key, value })
        },
        flashAll() {
          flashedAll = true
        },
      },
    },
    flashedAll() {
      return flashedAll
    },
    flashes,
    redirects,
  }
}

test.group('resolveInertiaMutation', () => {
  test('returns action result when no success surface is configured', async ({ assert }) => {
    const { ctx, flashes, redirects } = createContext()

    const result = await resolveInertiaMutation(ctx as never, {
      action: async () => 'ok',
    })

    assert.equal(result, 'ok')
    assert.deepEqual(flashes, [])
    assert.deepEqual(redirects, [])
  })

  test('flashes success notification and redirects to current URL by default', async ({
    assert,
  }) => {
    const { ctx, flashes, redirects } = createContext()

    const result = await resolveInertiaMutation(ctx as never, {
      action: async () => 'ok',
      successMessage: 'Saved.',
    })

    assert.equal(result, '/account')
    assert.deepEqual(flashes, [
      {
        key: 'notification',
        value: { message: 'Saved.', type: 'success' },
      },
    ])
    assert.deepEqual(redirects, ['/account'])
  })

  test('redirects to explicit destination after successful mutation', async ({ assert }) => {
    const { ctx, flashes, redirects } = createContext()

    const result = await resolveInertiaMutation(ctx as never, {
      action: async () => undefined,
      redirectTo: '/dashboard',
    })

    assert.equal(result, '/dashboard')
    assert.deepEqual(flashes, [])
    assert.deepEqual(redirects, ['/dashboard'])
  })

  test('does not reuse success redirect destination for failures', async ({ assert }) => {
    const { ctx, flashes, redirects } = createContext()

    await resolveInertiaMutation(ctx as never, {
      action: async () => {
        throw new DomainError('Cannot continue', 'business_logic_error')
      },
      redirectTo: '/dashboard',
    })

    assert.deepEqual(flashes, [
      {
        key: 'notification',
        value: {
          message: 'The requested action could not be completed.',
          type: 'error',
        },
      },
    ])
    assert.deepEqual(redirects, ['/account'])
  })

  test('uses explicit error redirect destination for failures', async ({ assert }) => {
    const { ctx, flashes, redirects } = createContext()

    await resolveInertiaMutation(ctx as never, {
      action: async () => {
        throw new DomainError('Cannot continue', 'business_logic_error')
      },
      errorRedirectTo: '/account',
      redirectTo: '/dashboard',
    })

    assert.deepEqual(flashes, [
      {
        key: 'notification',
        value: {
          message: 'The requested action could not be completed.',
          type: 'error',
        },
      },
    ])
    assert.deepEqual(redirects, ['/account'])
  })

  test('redirects with flashed public error for domain failures', async ({ assert }) => {
    const { ctx, flashedAll, flashes, redirects } = createContext()

    await resolveInertiaMutation(ctx as never, {
      action: async () => {
        throw new DomainError('Cannot continue', 'business_logic_error')
      },
      flashAll: true,
    })

    assert.isTrue(flashedAll())
    assert.deepEqual(flashes, [
      {
        key: 'notification',
        value: {
          message: 'The requested action could not be completed.',
          type: 'error',
        },
      },
    ])
    assert.deepEqual(redirects, ['/account'])
  })

  test('uses fallback error message for unexpected failures', async ({ assert }) => {
    const { ctx, flashes, redirects } = createContext()

    await resolveInertiaMutation(ctx as never, {
      action: async () => {
        throw new Error('Internal detail')
      },
      fallbackErrorMessage: 'Profile could not be updated. Please try again.',
    })

    assert.deepEqual(flashes, [
      {
        key: 'notification',
        value: {
          message: 'Profile could not be updated. Please try again.',
          type: 'error',
        },
      },
    ])
    assert.deepEqual(redirects, ['/account'])
  })

  test('uses resolver default fallback for unexpected failures', async ({ assert }) => {
    const { ctx, flashes, redirects } = createContext()

    await resolveInertiaMutation(ctx as never, {
      action: async () => {
        throw new Error('Internal detail')
      },
    })

    assert.deepEqual(flashes, [
      {
        key: 'notification',
        value: {
          message: 'The requested action could not be completed.',
          type: 'error',
        },
      },
    ])
    assert.deepEqual(redirects, ['/account'])
  })
})
