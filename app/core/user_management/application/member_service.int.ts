import type { AuditEventInput } from '#core/accounting/application/audit/types'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { type CriticalAuditTrail } from '#core/accounting/application/audit/critical_audit_trail'
import { auditEvents } from '#core/accounting/drizzle/schema'
import * as schema from '#core/common/drizzle/index'
import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'
import { and, eq } from 'drizzle-orm'

import {
  seedTestMember,
  seedTestOrganization,
  seedTestUser,
  setupTestDatabaseForGroup,
  TEST_TENANT_ID,
} from '../../../../tests/helpers/testcontainers_db.js'
import { MemberService } from './member_service.js'

const OWNER_USER_ID = 'member-service-owner-user'
const ADMIN_USER_ID = 'member-service-admin-user'
const MEMBER_USER_ID = 'member-service-member-user'
const OWNER_MEMBER_ID = 'member-service-owner-member'
const ADMIN_MEMBER_ID = 'member-service-admin-member'
const MEMBER_MEMBER_ID = 'member-service-regular-member'

class FailingAuditTrail implements CriticalAuditTrail {
  async record(
    _tx: Parameters<CriticalAuditTrail['record']>[0],
    _input: AuditEventInput
  ): Promise<void> {
    throw new Error('audit insert failed')
  }
}

test.group('MemberService integration', (group) => {
  let cleanup: () => Promise<void>
  let db: PostgresJsDatabase<typeof schema>

  group.setup(async () => {
    const ctx = await setupTestDatabaseForGroup()
    cleanup = ctx.cleanup
    db = await app.container.make('drizzle')

    await seedTestOrganization(db)
    await seedTestUser(db, {
      email: 'owner@member-service.test',
      id: OWNER_USER_ID,
      name: 'Owner',
      publicId: 'pub_member_service_owner',
    })
    await seedTestUser(db, {
      email: 'admin@member-service.test',
      id: ADMIN_USER_ID,
      name: 'Admin',
      publicId: 'pub_member_service_admin',
    })
    await seedTestUser(db, {
      email: 'member@member-service.test',
      id: MEMBER_USER_ID,
      name: 'Member',
      publicId: 'pub_member_service_member',
    })
  })

  group.each.setup(async () => {
    await db.delete(auditEvents)
    await db.delete(schema.member)

    await seedTestMember(db, {
      id: OWNER_MEMBER_ID,
      organizationId: TEST_TENANT_ID,
      role: 'owner',
      userId: OWNER_USER_ID,
    })
    await seedTestMember(db, {
      id: ADMIN_MEMBER_ID,
      organizationId: TEST_TENANT_ID,
      role: 'admin',
      userId: ADMIN_USER_ID,
    })
    await seedTestMember(db, {
      id: MEMBER_MEMBER_ID,
      organizationId: TEST_TENANT_ID,
      role: 'member',
      userId: MEMBER_USER_ID,
    })
  })

  group.teardown(async () => cleanup())

  test('updateMemberRole writes member_role_changed with before and after', async ({ assert }) => {
    const service = new MemberService(db)

    await service.updateMemberRole(MEMBER_MEMBER_ID, 'admin', TEST_TENANT_ID, OWNER_USER_ID)

    const [event] = await db
      .select({
        action: auditEvents.action,
        changes: auditEvents.changes,
        entityId: auditEvents.entityId,
        metadata: auditEvents.metadata,
        organizationId: auditEvents.organizationId,
      })
      .from(auditEvents)
      .where(eq(auditEvents.entityId, MEMBER_MEMBER_ID))
      .limit(1)

    assert.equal(event?.action, 'member_role_changed')
    assert.equal(event?.entityId, MEMBER_MEMBER_ID)
    assert.equal(event?.organizationId, TEST_TENANT_ID)
    assert.deepEqual(event?.changes, {
      after: { role: 'admin' },
      before: { role: 'member' },
    })
    assert.deepEqual(event?.metadata, {
      memberUserId: MEMBER_USER_ID,
    })
  })

  test('toggleMemberActive writes member_activated when reactivating a member', async ({
    assert,
  }) => {
    await db
      .update(schema.member)
      .set({ isActive: false })
      .where(eq(schema.member.id, MEMBER_MEMBER_ID))

    const service = new MemberService(db)
    await service.toggleMemberActive(MEMBER_MEMBER_ID, true, TEST_TENANT_ID, OWNER_USER_ID)

    const [event] = await db
      .select({ action: auditEvents.action, changes: auditEvents.changes })
      .from(auditEvents)
      .where(eq(auditEvents.entityId, MEMBER_MEMBER_ID))
      .limit(1)

    assert.equal(event?.action, 'member_activated')
    assert.deepEqual(event?.changes, {
      after: { isActive: true },
      before: { isActive: false },
    })
  })

  test('toggleMemberActive writes member_deactivated and normalizes admin to member', async ({
    assert,
  }) => {
    const service = new MemberService(db)
    await service.toggleMemberActive(ADMIN_MEMBER_ID, false, TEST_TENANT_ID, OWNER_USER_ID)

    const [updatedMember] = await db
      .select({ isActive: schema.member.isActive, role: schema.member.role })
      .from(schema.member)
      .where(eq(schema.member.id, ADMIN_MEMBER_ID))
      .limit(1)
    const [event] = await db
      .select({ action: auditEvents.action, changes: auditEvents.changes })
      .from(auditEvents)
      .where(eq(auditEvents.entityId, ADMIN_MEMBER_ID))
      .limit(1)

    assert.isFalse(updatedMember?.isActive ?? true)
    assert.equal(updatedMember?.role, 'member')
    assert.equal(event?.action, 'member_deactivated')
    assert.deepEqual(event?.changes, {
      after: { isActive: false, role: 'member' },
      before: { isActive: true, role: 'admin' },
    })
  })

  test('rolls back the membership mutation when audit insertion fails', async ({ assert }) => {
    const service = new MemberService(db, { auditTrail: new FailingAuditTrail() })

    await assert.rejects(
      () => service.updateMemberRole(MEMBER_MEMBER_ID, 'admin', TEST_TENANT_ID, OWNER_USER_ID),
      /audit insert failed/
    )

    const [updatedMember] = await db
      .select({ role: schema.member.role })
      .from(schema.member)
      .where(eq(schema.member.id, MEMBER_MEMBER_ID))
      .limit(1)
    const [event] = await db
      .select({ id: auditEvents.id })
      .from(auditEvents)
      .where(eq(auditEvents.entityId, MEMBER_MEMBER_ID))
      .limit(1)

    assert.equal(updatedMember?.role, 'member')
    assert.isUndefined(event)
  })

  test('database constraint rejects inactive admin rows', async ({ assert }) => {
    let rejected = false

    try {
      await db
        .update(schema.member)
        .set({ isActive: false, role: 'admin' })
        .where(
          and(
            eq(schema.member.id, MEMBER_MEMBER_ID),
            eq(schema.member.organizationId, TEST_TENANT_ID)
          )
        )
      assert.fail('Expected the database constraint to reject inactive admin rows.')
    } catch (error) {
      rejected = true
      assert.instanceOf(error, Error)
    }

    const [row] = await db
      .select({ isActive: schema.member.isActive, role: schema.member.role })
      .from(schema.member)
      .where(eq(schema.member.id, MEMBER_MEMBER_ID))
      .limit(1)

    assert.isTrue(rejected)
    assert.isTrue(row?.isActive ?? false)
    assert.equal(row?.role, 'member')
  })
})
