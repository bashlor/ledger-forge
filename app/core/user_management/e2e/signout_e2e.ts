import { test } from '@japa/runner'

import {
  bindTestServices,
  createTestPostgresContext,
} from '../../../../tests/helpers/test_postgres.js'

test.group('Logout E2E', (group) => {
  let context: Awaited<ReturnType<typeof createTestPostgresContext>>

  group.setup(async () => {
    context = await createTestPostgresContext()
    bindTestServices(context)
  })

  group.each.setup(async () => {
    await context.reset()
    await context.authAdapter.signUp('logout-test@example.com', 'SecureP@ss123', 'Logout Test User')
  })

  group.teardown(async () => {
    await context.cleanup()
  })

  test('logs out and returns to the home page as a guest', async ({ route, visit }) => {
    const page = await visit(route('signin.show'))

    await page.locator('#email').fill('logout-test@example.com')
    await page.locator('#password').fill('SecureP@ss123')
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(route('dashboard'))

    await page.locator('button[aria-label="Sign out from sidebar"]').click()
    await page.waitForURL('**/signin')

    await page.assertTextContains('h2', 'Secure access')
    await page.assertExists(page.locator('a[href="/signup"]'))
  })

  test('redirects protected pages back to signin after logout', async ({ route, visit }) => {
    const page = await visit(route('signin.show'))

    await page.locator('#email').fill('logout-test@example.com')
    await page.locator('#password').fill('SecureP@ss123')
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(route('dashboard'))

    await page.locator('button[aria-label="Sign out from sidebar"]').click()
    await page.waitForURL('**/signin')

    await page.goto(route('account.show'))

    await page.waitForURL('**/signin')
    await page.assertPath(route('signin.show'))
  })
})
