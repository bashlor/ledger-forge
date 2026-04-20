import type * as schema from '#core/common/drizzle/index'

import { test } from '@japa/runner'

import { organizationRowToWorkspaceShare } from './workspace_provisioning.js'

test.group('workspace provisioning (share mapping)', () => {
  test('marks anonymous workspace from metadata', ({ assert }) => {
    const row: typeof schema.organization.$inferSelect = {
      createdAt: new Date(),
      id: 'org-1',
      logo: null,
      metadata: JSON.stringify({ workspaceKind: 'anonymous' }),
      name: 'Anonymous workspace',
      slug: 'ws-abc',
    }
    const share = organizationRowToWorkspaceShare(row)
    assert.isTrue(share.isAnonymousWorkspace)
    assert.equal(share.name, 'Anonymous workspace')
    assert.equal(share.slug, 'ws-abc')
  })

  test('marks personal workspace from metadata', ({ assert }) => {
    const row: typeof schema.organization.$inferSelect = {
      createdAt: new Date(),
      id: 'org-2',
      logo: null,
      metadata: JSON.stringify({ workspaceKind: 'personal' }),
      name: 'alice workspace',
      slug: 'ws-def',
    }
    const share = organizationRowToWorkspaceShare(row)
    assert.isFalse(share.isAnonymousWorkspace)
  })

  test('treats unknown metadata as not anonymous', ({ assert }) => {
    const row: typeof schema.organization.$inferSelect = {
      createdAt: new Date(),
      id: 'org-3',
      logo: null,
      metadata: null,
      name: 'Legacy Org',
      slug: 'legacy',
    }
    const share = organizationRowToWorkspaceShare(row)
    assert.isFalse(share.isAnonymousWorkspace)
  })
})
