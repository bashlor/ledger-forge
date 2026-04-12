import { test } from '@japa/runner'

import {
  bindTestServices,
  createTestPostgresContext,
} from '../../../../tests/helpers/test_postgres.ts'

test.group('Login E2E', (group) => {
  let context: Awaited<ReturnType<typeof createTestPostgresContext>>

  group.setup(async () => {
    context = await createTestPostgresContext()
    bindTestServices(context)
  })

  group.each.setup(async () => {
    await context.reset()
    await context.authAdapter.signUp('login-test@example.com', 'SecureP@ss123', 'Login Test User')
  })

  group.teardown(async () => {
    await context.cleanup()
  })

  test('displays the signin form', async ({ route, visit }) => {
    const page = await visit(route('signin.show'))

    await page.locator('#email').waitFor()
    await page.assertExists(page.locator('#email'))
    await page.assertExists(page.locator('#password'))
    await page.assertTextContains('h2', 'Secure access')
  })

  test('logs the user in with valid credentials', async ({ route, visit }) => {
    const page = await visit(route('signin.show'))

    await page.locator('#email').fill('login-test@example.com')
    await page.locator('#password').fill('SecureP@ss123')
    await page.locator('button[type="submit"]').click()

    await page.waitForURL(route('dashboard'))
    await page.assertPath(route('dashboard'))
  })

  test('keeps the user on signin when credentials are invalid', async ({ route, visit }) => {
    const page = await visit(route('signin.show'))

    await page.locator('#email').fill('login-test@example.com')
    await page.locator('#password').fill('wrong-password')
    await page.locator('button[type="submit"]').click()

    await page.waitForURL('**/signin')
    await page.assertPath(route('signin.show'))
  })
})
