import { test } from '@japa/runner'

import { expectRejects } from './expect_rejects.js'

test.group('expectRejects', () => {
  test('passes when the callback rejects', async ({ assert }) => {
    await expectRejects(assert, async () => {
      throw new Error('boom')
    })
  })

  test('fails when the callback resolves', async ({ assert }) => {
    let thrown: Error | undefined

    try {
      await expectRejects(assert, async () => {})
    } catch (error) {
      thrown = error as Error
    }

    assert.exists(thrown)
    assert.include(thrown!.message, 'expected false to be true')
  })
})
