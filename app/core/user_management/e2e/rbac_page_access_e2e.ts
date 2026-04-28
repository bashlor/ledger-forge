import { member } from '#core/common/drizzle/index'
import { test } from '@japa/runner'
import { eq } from 'drizzle-orm'

import {
  bindTestServices,
  createTestPostgresContext,
} from '../../../../tests/helpers/test_postgres.js'

const MEMBER_EMAIL = 'member-rbac@example.com'
const MEMBER_PASSWORD = 'SecureP@ss123'

test.group('RBAC Page Access E2E', (group) => {
  let context: Awaited<ReturnType<typeof createTestPostgresContext>>
  let memberUserId: string

  group.setup(async () => {
    context = await createTestPostgresContext()
    bindTestServices(context)
  })

  group.each.setup(async () => {
    await context.reset()
    const authentication = await context.authAdapter.signUp(
      MEMBER_EMAIL,
      MEMBER_PASSWORD,
      'Member RBAC User'
    )
    memberUserId = authentication.user.id
  })

  group.teardown(async () => {
    await context.cleanup()
  })

  test('loads accounting pages for a member and hides restricted navigation', async ({
    browserContext,
    route,
    visit,
  }) => {
    await browserContext.clearCookies()
    const page = await visit(route('signin.show'))

    await page.locator('#email').fill(MEMBER_EMAIL)
    await page.locator('#password').fill(MEMBER_PASSWORD)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(route('dashboard'))

    await context.db.update(member).set({ role: 'member' }).where(eq(member.userId, memberUserId))

    await page.goto(route('customers.page'))
    await page.assertPath(route('customers.page'))
    await page.assertTextContains('body', 'Customers')

    const primaryNav = page.locator('nav[aria-label="Primary"]')
    await page.assertExists(primaryNav.locator('a[href="/customers"]'))
    await page.assertExists(primaryNav.locator('a[href="/invoices"]'))
    await page.assertExists(primaryNav.locator('a[href="/expenses"]'))
    await page.assertNotExists(primaryNav.locator('a[href="/dashboard"]'))
    await page.assertNotExists(primaryNav.locator('a[href="/organization"]'))

    await page.goto(route('invoices.page'))
    await page.assertTextContains('body', 'Invoices')

    await page.goto(route('expenses.page'))
    await page.assertTextContains('body', 'Expenses')
  })

  test('shows forbidden pages when a member opens admin-only areas', async ({
    browserContext,
    route,
    visit,
  }) => {
    await browserContext.clearCookies()
    const page = await visit(route('signin.show'))

    await page.locator('#email').fill(MEMBER_EMAIL)
    await page.locator('#password').fill(MEMBER_PASSWORD)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(route('dashboard'))

    await context.db.update(member).set({ role: 'member' }).where(eq(member.userId, memberUserId))

    await page.goto(route('dashboard'))
    await page.assertTextContains('body', 'Access denied')
    await page.assertTextContains('body', '403')

    await page.goto(route('organization.show'))
    await page.assertTextContains('body', 'Access denied')
    await page.assertTextContains('body', '403')
  })
})
