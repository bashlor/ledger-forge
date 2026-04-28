import type * as schema from '#core/common/drizzle/index'
import type {
  WorkspaceProvisioningResult,
  WorkspaceShareProps,
} from '#core/user_management/application/workspace_provisioning'
import type { AuthResult } from '#core/user_management/domain/authentication'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { test } from '@japa/runner'

import { AnonymousDemoWorkspaceService } from './anonymous_demo_workspace_service.js'

type AppDrizzleDb = PostgresJsDatabase<typeof schema>

class AnonymousDemoWorkspaceServiceStub extends AnonymousDemoWorkspaceService {
  clearedTokens: string[] = []
  operationLog: string[] = []
  provisionedUsers: string[] = []
  seededOrganizations: string[] = []

  constructor(private readonly workspaceShares: Record<string, null | WorkspaceShareProps>) {
    super({} as AppDrizzleDb)
  }

  protected override async clearActiveOrganizationForSession(sessionToken: string): Promise<void> {
    this.clearedTokens.push(sessionToken)
    this.operationLog.push(`clear:${sessionToken}`)
  }

  protected override async loadWorkspaceShare(
    organizationId: string
  ): Promise<null | WorkspaceShareProps> {
    return this.workspaceShares[organizationId] ?? null
  }

  protected override async provisionPersonalWorkspace(input: {
    isAnonymous: true
    sessionToken: string
    userId: string
  }): Promise<WorkspaceProvisioningResult> {
    this.provisionedUsers.push(input.userId)
    this.operationLog.push(`provision:${input.userId}`)
    return { organizationId: 'org-anonymous', wasProvisioned: true }
  }

  protected override async seedDemoWorkspace(input: {
    mode: 'personal'
    path: string
    provisioning: WorkspaceProvisioningResult
    userId: null | string
  }): Promise<boolean> {
    if (input.provisioning.organizationId) {
      this.seededOrganizations.push(input.provisioning.organizationId)
      this.operationLog.push(`seed:${input.provisioning.organizationId}`)
    }
    return true
  }
}

function createAuthSession(activeOrganizationId: null | string): AuthResult {
  return {
    session: {
      activeOrganizationId,
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
      token: 'session-token',
      userId: 'user-1',
    },
    user: {
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      email: 'temp@example.test',
      emailVerified: false,
      id: 'user-1',
      image: null,
      isAnonymous: true,
      name: 'Anonymous',
      publicId: 'pub-user-1',
    },
  }
}

function createWorkspaceShare(input: {
  id: string
  isAnonymousWorkspace: boolean
}): WorkspaceShareProps {
  return {
    id: input.id,
    isAnonymousWorkspace: input.isAnonymousWorkspace,
    name: input.isAnonymousWorkspace ? 'Anonymous workspace' : 'Named workspace',
    slug: input.id,
  }
}

test.group('AnonymousDemoWorkspaceService', () => {
  test('keeps an active anonymous workspace without reseeding it', async ({ assert }) => {
    const service = new AnonymousDemoWorkspaceServiceStub({
      'org-anonymous': createWorkspaceShare({
        id: 'org-anonymous',
        isAnonymousWorkspace: true,
      }),
    })
    const authSession = createAuthSession('org-anonymous')
    const auth = {
      getSession: async () => {
        throw new Error('session refresh should not be needed')
      },
    }

    const resolved = await service.ensureWorkspace({
      auth,
      authSession,
      path: '/dashboard',
      sessionToken: 'session-token',
    })

    assert.equal(resolved.session.activeOrganizationId, 'org-anonymous')
    assert.deepEqual(service.clearedTokens, [])
    assert.deepEqual(service.provisionedUsers, [])
    assert.deepEqual(service.seededOrganizations, [])
    assert.deepEqual(service.operationLog, [])
  })

  test('clears a normal workspace then provisions a dedicated anonymous workspace', async ({
    assert,
  }) => {
    const service = new AnonymousDemoWorkspaceServiceStub({
      'org-normal': createWorkspaceShare({ id: 'org-normal', isAnonymousWorkspace: false }),
    })
    const refreshedSessions = [createAuthSession(null), createAuthSession('org-anonymous')]
    const auth = {
      getSession: async () => refreshedSessions.shift() ?? null,
    }

    const resolved = await service.ensureWorkspace({
      auth,
      authSession: createAuthSession('org-normal'),
      path: '/dashboard',
      sessionToken: 'session-token',
    })

    assert.equal(resolved.session.activeOrganizationId, 'org-anonymous')
    assert.deepEqual(service.clearedTokens, ['session-token'])
    assert.deepEqual(service.provisionedUsers, ['user-1'])
    assert.deepEqual(service.seededOrganizations, ['org-anonymous'])
    assert.deepEqual(service.operationLog, [
      'clear:session-token',
      'provision:user-1',
      'seed:org-anonymous',
    ])
  })

  test('falls back to a cleared session when refresh after clearing returns null', async ({
    assert,
  }) => {
    const service = new AnonymousDemoWorkspaceServiceStub({
      'org-normal': createWorkspaceShare({ id: 'org-normal', isAnonymousWorkspace: false }),
    })
    const refreshedSessions = [null, createAuthSession('org-anonymous')]
    const auth = {
      getSession: async () => refreshedSessions.shift() ?? null,
    }

    const resolved = await service.ensureWorkspace({
      auth,
      authSession: createAuthSession('org-normal'),
      path: '/dashboard',
      sessionToken: 'session-token',
    })

    assert.equal(resolved.session.activeOrganizationId, 'org-anonymous')
    assert.deepEqual(service.clearedTokens, ['session-token'])
    assert.deepEqual(service.provisionedUsers, ['user-1'])
    assert.deepEqual(service.seededOrganizations, ['org-anonymous'])
    assert.deepEqual(service.operationLog, [
      'clear:session-token',
      'provision:user-1',
      'seed:org-anonymous',
    ])
  })

  test('falls back to the provisioned anonymous workspace when refresh after provisioning returns null', async ({
    assert,
  }) => {
    const service = new AnonymousDemoWorkspaceServiceStub({})
    const auth = {
      getSession: async () => null,
    }

    const resolved = await service.ensureWorkspace({
      auth,
      authSession: createAuthSession(null),
      path: '/dashboard',
      sessionToken: 'session-token',
    })

    assert.equal(resolved.session.activeOrganizationId, 'org-anonymous')
    assert.deepEqual(service.clearedTokens, [])
    assert.deepEqual(service.provisionedUsers, ['user-1'])
    assert.deepEqual(service.seededOrganizations, ['org-anonymous'])
    assert.deepEqual(service.operationLog, ['provision:user-1', 'seed:org-anonymous'])
  })
})
