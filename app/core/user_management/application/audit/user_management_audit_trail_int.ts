import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { auditEvents } from '#core/accounting/drizzle/schema'
import * as schema from '#core/common/drizzle/index'
import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'
import { eq } from 'drizzle-orm'

import {
  seedTestOrganization,
  seedTestUser,
  setupTestDatabaseForGroup,
  TEST_TENANT_ID,
} from '../../../../../tests/helpers/testcontainers_db.js'
import { UserManagementAuditTrail } from './user_management_audit_trail.js'

test.group('UserManagementAuditTrail', (group) => {
  let cleanup: () => Promise<void>
  let db: PostgresJsDatabase<typeof schema>
  let auditTrail: UserManagementAuditTrail

  group.setup(async () => {
    const ctx = await setupTestDatabaseForGroup()
    cleanup = ctx.cleanup
    db = await app.container.make('drizzle')
    auditTrail = new UserManagementAuditTrail(db)
    await seedTestOrganization(db)
    await seedTestUser(db, {
      email: 'audit-user@example.com',
      id: 'user_audit_trail',
      name: 'Audit User',
      publicId: 'pub_user_audit_trail',
    })
  })

  group.each.setup(async () => {
    await db.delete(auditEvents)
    await db.delete(schema.session)
    await db.insert(schema.session).values({
      activeOrganizationId: TEST_TENANT_ID,
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
      id: 'session_audit_trail',
      token: 'session_audit_token',
      userId: 'user_audit_trail',
    })
  })

  group.teardown(async () => cleanup())

  test('persists tenant-scoped sign-in and sign-out audit events', async ({ assert }) => {
    const context = await auditTrail.resolveSessionContext('session_audit_token')

    await auditTrail.recordSignInSuccess({
      isAnonymous: false,
      sessionToken: 'session_audit_token',
      userId: 'user_audit_trail',
    })
    await auditTrail.recordSignOutSuccess({ context, isAnonymous: false })

    const rows = await db
      .select({
        action: auditEvents.action,
        actorId: auditEvents.actorId,
        entityId: auditEvents.entityId,
        entityType: auditEvents.entityType,
        organizationId: auditEvents.organizationId,
      })
      .from(auditEvents)
      .where(eq(auditEvents.organizationId, TEST_TENANT_ID))
      .orderBy(auditEvents.action)

    assert.deepEqual(rows, [
      {
        action: 'sign_in_success',
        actorId: 'user_audit_trail',
        entityId: 'session_audit_trail',
        entityType: 'auth',
        organizationId: TEST_TENANT_ID,
      },
      {
        action: 'sign_out_success',
        actorId: 'user_audit_trail',
        entityId: 'session_audit_trail',
        entityType: 'auth',
        organizationId: TEST_TENANT_ID,
      },
    ])
  })

  test('sanitizes sign-in failure metadata', async ({ assert }) => {
    await auditTrail.recordSignInFailure({
      email: 'Sensitive.User@example.com',
      error: new Error('invalid password'),
    })

    const [row] = await db
      .select({
        actorId: auditEvents.actorId,
        metadata: auditEvents.metadata,
        organizationId: auditEvents.organizationId,
      })
      .from(auditEvents)
      .where(eq(auditEvents.action, 'sign_in_failure'))
      .limit(1)

    assert.isNull(row?.actorId)
    assert.isNull(row?.organizationId)
    assert.isObject(row?.metadata)
    assert.notInclude(JSON.stringify(row?.metadata), 'Sensitive.User@example.com')
    assert.notInclude(JSON.stringify(row?.metadata), 'invalid password')
    assert.match(String((row?.metadata as Record<string, unknown>)?.emailHash), /^[a-f0-9]{64}$/)
  })
})
