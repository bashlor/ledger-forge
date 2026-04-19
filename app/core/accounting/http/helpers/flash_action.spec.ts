import { DomainError } from '#core/shared/domain_error'
import { test } from '@japa/runner'

import { flashAction } from './flash_action.js'

function createContext() {
  const flashes: Array<{ key: string; value: unknown }> = []

  return {
    ctx: {
      session: {
        flash(key: string, value: unknown) {
          flashes.push({ key, value })
        },
      },
    },
    flashes,
  }
}

test.group('flashAction', () => {
  test('flashes a success notification when the action succeeds', async ({ assert }) => {
    const { ctx, flashes } = createContext()

    await flashAction(ctx as never, async () => {}, 'Saved.', 'Fallback.')

    assert.deepEqual(flashes, [
      {
        key: 'notification',
        value: { message: 'Saved.', type: 'success' },
      },
    ])
  })

  test('flashes a domain error notification for recoverable errors', async ({ assert }) => {
    const { ctx, flashes } = createContext()

    await flashAction(
      ctx as never,
      async () => {
        throw new DomainError('Business rule failed', 'business_logic_error')
      },
      'Saved.',
      'Fallback.'
    )

    assert.deepEqual(flashes, [
      {
        key: 'notification',
        value: { message: 'The requested action could not be completed.', type: 'error' },
      },
    ])
  })

  test('flashes customer field errors when the resolved public error includes them', async ({
    assert,
  }) => {
    const { ctx, flashes } = createContext()

    await flashAction(
      ctx as never,
      async () => {
        throw new DomainError('Customer address is required.', 'invalid_data')
      },
      'Saved.',
      'Fallback.'
    )

    assert.deepEqual(flashes, [
      {
        key: 'inputErrorsBag',
        value: { address: 'Customer address is required.' },
      },
      {
        key: 'notification',
        value: { message: 'Customer address is required.', type: 'error' },
      },
    ])
  })

  test('rethrows not_found domain errors', async ({ assert }) => {
    const { ctx, flashes } = createContext()
    const error = new DomainError('Missing', 'not_found')

    await assert.rejects(
      () =>
        flashAction(
          ctx as never,
          async () => {
            throw error
          },
          'Saved.',
          'Fallback.'
        ),
      'Missing'
    )
    assert.deepEqual(flashes, [])
  })

  test('rethrows unexpected non-domain errors', async ({ assert }) => {
    const { ctx, flashes } = createContext()

    await assert.rejects(
      () =>
        flashAction(
          ctx as never,
          async () => {
            throw new Error('Boom')
          },
          'Saved.',
          'Fallback.'
        ),
      'Boom'
    )
    assert.deepEqual(flashes, [])
  })
})
