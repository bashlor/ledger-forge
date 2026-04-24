import { DomainError } from '#core/common/errors/domain_error'
import { test } from '@japa/runner'

import { runInertiaFormMutation } from './error_surface.js'

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

test.group('runInertiaFormMutation', () => {
  test('returns action result when mutation succeeds', async ({ assert }) => {
    const { ctx, flashes, redirects } = createContext()

    const result = await runInertiaFormMutation(ctx as never, async () => 'ok')

    assert.equal(result, 'ok')
    assert.deepEqual(flashes, [])
    assert.deepEqual(redirects, [])
  })

  test('redirects with flashed public error for domain failures', async ({ assert }) => {
    const { ctx, flashedAll, flashes, redirects } = createContext()

    await runInertiaFormMutation(
      ctx as never,
      async () => {
        throw new DomainError('Cannot continue', 'business_logic_error')
      },
      { flashAll: true }
    )

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
})
