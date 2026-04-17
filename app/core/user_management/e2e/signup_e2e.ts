import { test } from '@japa/runner'

import {
  bindTestServices,
  createTestPostgresContext,
} from '../../../../tests/helpers/test_postgres.js'

test.group('Signup E2E', (group) => {
  let context: Awaited<ReturnType<typeof createTestPostgresContext>>

  group.setup(async () => {
    context = await createTestPostgresContext()
    bindTestServices(context)
  })

  group.each.setup(async () => {
    await context.reset()
    await context.authAdapter.signUp('already-exists@example.com', 'SecureP@ss123', 'Existing User')
  })

  group.teardown(async () => {
    await context.cleanup()
  })

  test('displays the signup form', async ({ browserContext, route, visit }) => {
    await browserContext.clearCookies()
    const page = await visit(route('signup.show'))

    await page.locator('#fullName').waitFor()
    await page.assertExists(page.locator('#fullName'))
    await page.assertExists(page.locator('#email'))
    await page.assertExists(page.locator('#password'))
    await page.assertExists(page.locator('#passwordConfirmation'))
    await page.assertTextContains('h2', 'Create account')
  })

  test('creates an account with valid data', async ({ browserContext, route, visit }) => {
    await browserContext.clearCookies()
    const page = await visit(route('signup.show'))

    await page.locator('#fullName').fill('Jane Doe')
    await page.locator('#email').fill('jane.doe@example.com')
    await page.locator('#password').fill('SecureP@ss123')
    await page.locator('#passwordConfirmation').fill('SecureP@ss123')
    await page.locator('button[type="submit"]').click()

    await page.waitForURL('**/dashboard')
    await page.assertPath('/dashboard')
  })

  test('stays on signup when the email is already taken', async ({
    browserContext,
    route,
    visit,
  }) => {
    await browserContext.clearCookies()
    const page = await visit(route('signup.show'))

    await page.locator('#fullName').fill('Another User')
    await page.locator('#email').fill('already-exists@example.com')
    await page.locator('#password').fill('SecureP@ss123')
    await page.locator('#passwordConfirmation').fill('SecureP@ss123')
    await page.locator('button[type="submit"]').click()

    await page.waitForURL(route('signup.show'))
    await page.assertPath(route('signup.show'))
  })
})
